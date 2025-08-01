// app/api/generate-widget-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getCurrentUser, isValidInstagramToken } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

const redis = Redis.fromEnv();

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
    console.log('=== GENERATE WIDGET TOKEN REQUEST ===');
    
    // Use the same auth as feed API
    const user = await getCurrentUser();
    
    if (!user) {
      console.error('No user found via getCurrentUser()');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log(`Processing token generation for user: ${user.id} (${user.username})`);

    // Check if Instagram token is still valid (same as feed API)
    const isTokenValid = await isValidInstagramToken(user.accessToken);
    
    if (!isTokenValid) {
      console.error(`Instagram token invalid for user: ${user.id}`);
      return NextResponse.json(
        { 
          error: 'Instagram token expired',
          message: 'Please reconnect your Instagram account',
          reauth_required: true,
          auth_url: `/api/auth/login?return_url=${encodeURIComponent('/feed-builder')}`
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
      userId: user.id, // Use user.id instead of email
      username: user.username,
      instagramUserId: user.instagramUserId,
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
    const userTokensKey = `user:tokens:${user.id}`;
    const userTokens = await redis.get<string[]>(userTokensKey) || [];
    userTokens.push(token);
    await redis.set(userTokensKey, userTokens, { ex: redisExpirySeconds });

    console.log(`Generated widget token: ${token} for user: ${user.id} (${user.username})`);

    return NextResponse.json({
      token,
      expiresAt: new Date(expiresAt).toISOString(),
      expiresIn,
      config: tokenData.config,
      user: {
        id: user.id,
        username: user.username,
        instagramUserId: user.instagramUserId
      },
      created: new Date().toISOString()
    });

  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate widget token',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get user's existing tokens
export async function GET(request: NextRequest) {
  try {
    // Use the same auth as feed API
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userTokensKey = `user:tokens:${user.id}`;
    const userTokens = await redis.get<string[]>(userTokensKey) || [];

    // Get details for each token
    const tokenDetails = await Promise.all(
      userTokens.map(async (token) => {
        const tokenData = await redis.get<{
          userId: string;
          username: string;
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
      count: validTokens.length,
      user: {
        id: user.id,
        username: user.username
      }
    });

  } catch (error) {
    console.error('Token list error:', error);
    return NextResponse.json(
      { error: 'Failed to get tokens' },
      { status: 500 }
    );
  }
}