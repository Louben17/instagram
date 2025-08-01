// app/api/generate-widget-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const redis = Redis.fromEnv();

// Local type definitions
interface User {
  instagramUserId: string;
  username: string;
  accessToken: string;
  tokenExpiresAt: number;
  isActive: boolean;
  mediaCount: number;
}

const RedisKeys = {
  user: (email: string) => `user:${email}`,
  userMedia: (email: string) => `user:media:${email}`,
};

// Generate random token
function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Generate widget token request received');
    
    // Get user from multiple possible session cookies
    const cookieStore = cookies();
    console.log('Available cookies:', cookieStore.getAll().map(c => c.name));
    
    // Try different possible cookie names
    const possibleCookies = [
      'instagram-widget-session',
      'session',
      'auth-session',
      'user-session',
      '__Secure-next-auth.session-token',
      'next-auth.session-token'
    ];
    
    let sessionCookie;
    let userEmail: string | undefined;
    
    // Try to find a valid session cookie
    for (const cookieName of possibleCookies) {
      sessionCookie = cookieStore.get(cookieName);
      if (sessionCookie?.value) {
        console.log(`Found session cookie: ${cookieName}`);
        try {
          const sessionData = JSON.parse(sessionCookie.value);
          userEmail = sessionData.email || sessionData.user?.email;
          if (userEmail) {
            console.log(`Found user email in ${cookieName}: ${userEmail}`);
            break;
          }
        } catch (e) {
          console.log(`Failed to parse ${cookieName}:`, e);
          // Try treating it as a direct email
          if (sessionCookie.value.includes('@')) {
            userEmail = sessionCookie.value;
            console.log(`Using direct email from ${cookieName}: ${userEmail}`);
            break;
          }
        }
      }
    }
    
    // If no session cookie found, try to get user from Authorization header
    if (!userEmail) {
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        console.log('Trying authorization header');
        // Handle bearer token or other auth methods
      }
    }
    
    // If still no user, try to extract from request body or URL
    if (!userEmail) {
      try {
        const body = await request.json();
        userEmail = body.userEmail || body.email;
        console.log('User email from request body:', userEmail);
      } catch (e) {
        console.log('No valid request body');
      }
    }
    
    if (!userEmail) {
      console.error('No user email found in any session or auth method');
      return NextResponse.json(
        { 
          error: 'Authentication required',
          debug: {
            cookies: cookieStore.getAll().map(c => ({ name: c.name, hasValue: !!c.value })),
            message: 'No valid session found'
          }
        },
        { status: 401 }
      );
    }

    console.log(`Processing token generation for user: ${userEmail}`);

    // Get user from Redis
    const user = await redis.get<User>(RedisKeys.user(userEmail));
    
    if (!user) {
      console.error(`User not found in Redis: ${userEmail}`);
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }
    
    if (!user.isActive) {
      console.error(`User not active: ${userEmail}`);
      return NextResponse.json(
        { error: 'User account is not active' },
        { status: 404 }
      );
    }

    // Check if Instagram token is still valid
    if (user.tokenExpiresAt < Date.now()) {
      console.error(`Instagram token expired for user: ${userEmail}`);
      return NextResponse.json(
        { 
          error: 'Instagram token expired',
          message: 'Please reconnect your Instagram account'
        },
        { status: 401 }
      );
    }

    // Parse request body for config and expiry
    const body = await request.json().catch(() => ({}));
    const { config, expiresIn = '1y' } = body;

    // Calculate expiry time (default 1 year)
    let expiryMs: number;
    if (expiresIn === '1y') {
      expiryMs = 365 * 24 * 60 * 60 * 1000; // 1 year
    } else if (expiresIn === '30d') {
      expiryMs = 30 * 24 * 60 * 60 * 1000; // 30 days
    } else if (expiresIn === '7d') {
      expiryMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    } else {
      expiryMs = 365 * 24 * 60 * 60 * 1000; // default 1 year
    }

    const expiresAt = Date.now() + expiryMs;

    // Generate unique token
    let token: string;
    let attempts = 0;
    do {
      token = generateToken();
      attempts++;
      
      // Check if token already exists
      const exists = await redis.exists(`widget:token:${token}`);
      if (!exists) break;
      
      if (attempts > 10) {
        throw new Error('Failed to generate unique token');
      }
    } while (true);

    // Store token in Redis
    const tokenData = {
      userId: userEmail,
      config: config || {
        columns: 3,
        rows: 3,
        spacing: 8,
        borderRadius: 8,
        showCaptions: true,
        showOverlay: true,
        hoverEffect: 'zoom',
        backgroundColor: '#ffffff',
        captionColor: '#374151',
        overlayColor: 'rgba(0,0,0,0.7)'
      },
      createdAt: Date.now(),
      expiresAt: expiresAt,
    };

    const tokenKey = `widget:token:${token}`;
    
    // Store with expiry (add extra time for cleanup)
    const redisExpirySeconds = Math.floor(expiryMs / 1000) + 86400; // +1 day for cleanup
    await redis.set(tokenKey, tokenData, { ex: redisExpirySeconds });

    // Also store in user's token list for management
    const userTokensKey = `user:tokens:${userEmail}`;
    const userTokens = await redis.get<string[]>(userTokensKey) || [];
    userTokens.push(token);
    await redis.set(userTokensKey, userTokens, { ex: redisExpirySeconds });

    console.log(`Generated widget token: ${token} for user: ${userEmail}`);

    return NextResponse.json({
      token,
      expiresAt: new Date(expiresAt).toISOString(),
      expiresIn,
      config: tokenData.config,
      created: new Date().toISOString()
    });

  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate widget token',
        message: error instanceof Error ? error.message : 'Unknown error',
        debug: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// Get user's existing tokens
export async function GET(request: NextRequest) {
  try {
    // Same session handling as POST
    const cookieStore = cookies();
    
    const possibleCookies = [
      'instagram-widget-session',
      'session', 
      'auth-session',
      'user-session',
      '__Secure-next-auth.session-token',
      'next-auth.session-token'
    ];
    
    let userEmail: string | undefined;
    
    for (const cookieName of possibleCookies) {
      const sessionCookie = cookieStore.get(cookieName);
      if (sessionCookie?.value) {
        try {
          const sessionData = JSON.parse(sessionCookie.value);
          userEmail = sessionData.email || sessionData.user?.email;
          if (userEmail) break;
        } catch (e) {
          if (sessionCookie.value.includes('@')) {
            userEmail = sessionCookie.value;
            break;
          }
        }
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userTokensKey = `user:tokens:${userEmail}`;
    const userTokens = await redis.get<string[]>(userTokensKey) || [];

    // Get details for each token
    const tokenDetails = await Promise.all(
      userTokens.map(async (token) => {
        const tokenData = await redis.get<{
          userId: string;
          config: any;
          createdAt: number;
          expiresAt: number;
        }>(`widget:token:${token}`);
        
        if (!tokenData) {
          return null;
        }
        
        return {
          token,
          config: tokenData.config,
          createdAt: new Date(tokenData.createdAt).toISOString(),
          expiresAt: new Date(tokenData.expiresAt).toISOString(),
          isExpired: tokenData.expiresAt < Date.now()
        };
      })
    );

    // Filter out null values (expired tokens)
    const validTokens = tokenDetails.filter(Boolean);

    return NextResponse.json({
      tokens: validTokens,
      count: validTokens.length
    });

  } catch (error) {
    console.error('Token list error:', error);
    return NextResponse.json(
      { error: 'Failed to get tokens' },
      { status: 500 }
    );
  }
}