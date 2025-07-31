import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getCurrentUser, isValidInstagramToken } from '../../../lib/auth';
import { InstagramMedia, RedisKeys } from '../../../types/user';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const redis = Redis.fromEnv();

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // Check if token is still valid
    const isTokenValid = await isValidInstagramToken(user.accessToken);
    
    if (!isTokenValid) {
      return NextResponse.json(
        { 
          error: 'Instagram token expired', 
          reauth_required: true,
          auth_url: `/api/auth/login?return_url=${encodeURIComponent('/dashboard')}`
        }, 
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 25);
    const cacheKey = `${RedisKeys.userMedia(user.id)}:${limit}`;

    // Try to get from cache first
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
      });
    }

    // Fetch fresh data from Instagram
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
            reauth_required: true,
            auth_url: `/api/auth/login?return_url=${encodeURIComponent('/dashboard')}`
          }, 
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch Instagram data' }, 
        { status: mediaResponse.status }
      );
    }

    const mediaData = await mediaResponse.json();
    const media: InstagramMedia[] = mediaData.data || [];

    // Cache the result for 5 minutes
    await redis.set(cacheKey, media, { ex: 300 });

    // Rate limiting - track API usage
    const rateLimitKey = RedisKeys.rateLimitApi(user.id);
    const currentUsage = await redis.incr(rateLimitKey);
    
    if (currentUsage === 1) {
      await redis.expire(rateLimitKey, 3600); // Reset every hour
    }

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
      rate_limit: {
        used: currentUsage,
        limit: 1000, // Instagram limit per hour
        reset_time: new Date(Date.now() + 3600000).toISOString(),
      },
      cached: false,
      fetch_time: new Date().toISOString()
    });

  } catch (error) {
    console.error('Feed API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}