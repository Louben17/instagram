import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { RedisKeys, User, InstagramMedia } from '../../../../types/user';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const redis = Redis.fromEnv();

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '9'), 25);
    const token = params.token;

    // Add CORS headers for iframe embedding
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors *;",
    };

    if (!token) {
      return NextResponse.json(
        { error: 'Widget token is required' },
        { status: 400, headers }
      );
    }

    // Get widget token data from Redis
    const tokenKey = `widget:token:${token}`;
    const tokenData = await redis.get<{
      userId: string;
      createdAt: number;
      expiresAt: number;
    }>(tokenKey);
    
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired widget token' },
        { status: 401, headers }
      );
    }

    // Check if token is expired
    if (tokenData.expiresAt < Date.now()) {
      await redis.del(tokenKey); // Clean up expired token
      return NextResponse.json(
        { error: 'Widget token has expired' },
        { status: 401, headers }
      );
    }

    // Get user from Redis
    const user = await redis.get<User>(RedisKeys.user(tokenData.userId));
    
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 404, headers }
      );
    }

    // Check if Instagram token is expired
    if (user.tokenExpiresAt < Date.now()) {
      return NextResponse.json(
        { 
          error: 'Instagram token expired',
          message: 'The Instagram access token for this user has expired. The user needs to re-authenticate.'
        },
        { status: 401, headers }
      );
    }

    const cacheKey = `${RedisKeys.userMedia(tokenData.userId)}:${limit}`;

    // Try to get from cache first (5 minute cache)
    let cachedMedia = await redis.get<InstagramMedia[]>(cacheKey);
    
    if (cachedMedia) {
      return NextResponse.json({
        data: cachedMedia,
        user: {
          username: user.username,
          id: user.instagramUserId,
          media_count: user.mediaCount,
        },
        cached: true,
        cache_time: new Date().toISOString()
      }, { headers });
    }

    // Fetch fresh data from Instagram Graph API
    const mediaResponse = await fetch(
      `https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,username&limit=${limit}&access_token=${user.accessToken}`
    );

    if (!mediaResponse.ok) {
      const errorText = await mediaResponse.text();
      console.error('Instagram API error:', errorText);
      
      if (mediaResponse.status === 401) {
        return NextResponse.json(
          { 
            error: 'Instagram authorization expired',
            message: 'The Instagram access token has expired. Please re-authenticate.'
          },
          { status: 401, headers }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch Instagram data',
          message: 'Unable to connect to Instagram API'
        },
        { status: mediaResponse.status, headers }
      );
    }

    const mediaData = await mediaResponse.json();
    const media: InstagramMedia[] = mediaData.data || [];

    // Cache the result for 5 minutes
    await redis.set(cacheKey, media, { ex: 300 });

    return NextResponse.json({
      data: media,
      user: {
        username: user.username,
        id: user.instagramUserId,
        media_count: user.mediaCount,
      },
      pagination: {
        next: mediaData.paging?.next,
        previous: mediaData.paging?.previous,
      },
      cached: false,
      fetch_time: new Date().toISOString()
    }, { headers });

  } catch (error) {
    console.error('Widget token API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching the Instagram feed'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}