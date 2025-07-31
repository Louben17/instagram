import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { 
  User, 
  UserSession, 
  InstagramTokenResponse, 
  InstagramUserInfo,
  RedisKeys 
} from '../../../../types/user';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const redis = Redis.fromEnv();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle Instagram OAuth errors
    if (error) {
      console.error('Instagram OAuth error:', error);
      return NextResponse.redirect('/auth/error?error=access_denied');
    }

    if (!code || !state) {
      return NextResponse.redirect('/auth/error?error=missing_code');
    }

    // Verify state parameter
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (e) {
      return NextResponse.redirect('/auth/error?error=invalid_state');
    }

    // Exchange code for access token (Instagram Business Login)
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_CLIENT_ID!,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect('/auth/error?error=token_exchange_failed');
    }

    const tokenData = await tokenResponse.json();
    
    // Instagram Business Login returns data array
    const authData = tokenData.data?.[0];
    if (!authData) {
      console.error('Invalid token response format:', tokenData);
      return NextResponse.redirect('/auth/error?error=invalid_token_response');
    }

    // Get Instagram user info using Graph API
    const userInfoResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${authData.access_token}`
    );

    if (!userInfoResponse.ok) {
      console.error('User info fetch failed:', await userInfoResponse.text());
      return NextResponse.redirect('/auth/error?error=user_info_failed');
    }

    const userInfo = await userInfoResponse.json();

    // Check if user already exists
    let existingUser = await redis.get<User>(RedisKeys.userByInstagramId(userInfo.id));
    
    const now = Date.now();
    const tokenExpiresAt = now + 60 * 60 * 1000; // Short-lived token expires in 1 hour

    let user: User;
    
    if (existingUser) {
      // Update existing user
      user = {
        ...existingUser,
        username: userInfo.username,
        accessToken: authData.access_token,
        tokenExpiresAt,
        mediaCount: userInfo.media_count,
        lastLoginAt: now,
        isActive: true,
      };
    } else {
      // Create new user
      const userId = uuidv4();
      user = {
        id: userId,
        instagramUserId: userInfo.id,
        username: userInfo.username,
        accessToken: authData.access_token,
        tokenExpiresAt,
        mediaCount: userInfo.media_count,
        createdAt: now,
        lastLoginAt: now,
        isActive: true,
      };
    }

    // Save user to Redis
    await Promise.all([
      redis.set(RedisKeys.user(user.id), user),
      redis.set(RedisKeys.userByInstagramId(user.instagramUserId), user),
    ]);

    // Create session
    const sessionId = uuidv4();
    const session: UserSession = {
      userId: user.id,
      sessionId,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000, // 30 days
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    // Save session
    await redis.set(RedisKeys.session(sessionId), session, {
      ex: 30 * 24 * 60 * 60, // 30 days in seconds
    });

    // Set secure HTTP-only cookie
    const cookieStore = cookies();
    cookieStore.set('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    // Redirect to return URL or dashboard
    const returnUrl = stateData.returnUrl || '/dashboard';
    return NextResponse.redirect(new URL(returnUrl, request.url));

  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect('/auth/error?error=internal_error');
  }
}