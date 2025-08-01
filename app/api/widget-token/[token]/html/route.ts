// app/api/widget-token/[token]/html/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

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

interface InstagramMedia {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  caption?: string;
  timestamp: string;
  username: string;
}

const RedisKeys = {
  user: (email: string) => `user:${email}`,
  userMedia: (email: string) => `user:media:${email}`,
};

function generateWidgetHTML(posts: InstagramMedia[], user: any, config: any = {}) {
  const {
    columns = 3,
    rows = 3,
    spacing = 8,
    borderRadius = 8,
    showCaptions = true,
    showOverlay = true,
    hoverEffect = 'zoom',
    backgroundColor = '#ffffff',
    captionColor = '#374151',
    overlayColor = 'rgba(0,0,0,0.7)'
  } = config;

  const maxPosts = columns * rows;
  const displayPosts = posts.slice(0, maxPosts);
  const feedId = `instagram-widget-${Date.now()}`;

  const css = `
<style>
body { 
  margin: 0; 
  padding: 0; 
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
  background: ${backgroundColor};
}
.${feedId} {
  display: grid;
  grid-template-columns: repeat(${columns}, 1fr);
  gap: ${spacing}px;
  width: 100%;
  background: ${backgroundColor};
  padding: ${spacing}px;
  border-radius: ${borderRadius}px;
  box-sizing: border-box;
}
.${feedId} .feed-item {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: ${borderRadius}px;
  cursor: pointer;
  transition: transform 0.2s ease;
  background: #f0f0f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
${hoverEffect === 'zoom' ? `.${feedId} .feed-item:hover { transform: scale(1.03); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }` : ''}
${hoverEffect === 'lift' ? `.${feedId} .feed-item:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }` : ''}
.${feedId} .feed-item img, .${feedId} .feed-item video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.${feedId} .feed-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: ${overlayColor};
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  color: white;
  font-size: 12px;
  text-align: center;
  padding: 8px;
  box-sizing: border-box;
}
.${feedId} .feed-item:hover .feed-overlay {
  opacity: ${showOverlay ? '1' : '0'};
}
.${feedId} .feed-caption {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  color: white;
  padding: 8px;
  font-size: 11px;
  line-height: 1.2;
  max-height: 50%;
  overflow: hidden;
  display: ${showCaptions ? 'block' : 'none'};
  box-sizing: border-box;
}
.${feedId} .feed-username {
  text-align: center;
  margin-bottom: ${spacing}px;
  font-weight: 600;
  color: ${captionColor};
  font-size: 16px;
  grid-column: 1 / -1;
}
@media (max-width: 768px) {
  .${feedId} { 
    grid-template-columns: repeat(${Math.min(columns, 3)}, 1fr); 
    gap: ${Math.max(spacing - 1, 2)}px;
  }
}
@media (max-width: 480px) {
  .${feedId} { 
    grid-template-columns: repeat(${Math.min(columns, 2)}, 1fr); 
    gap: ${Math.max(spacing - 1, 2)}px;
  }
}
</style>`;

  const safeCaption = (caption: string) => 
    caption.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const postsHTML = displayPosts.length > 0 ? displayPosts.map(post => `
    <div class="feed-item" onclick="window.open('${post.permalink}', '_blank')">
      ${post.media_type === 'VIDEO' ? 
        `<video src="${post.media_url}" poster="${post.thumbnail_url || post.media_url}" preload="metadata"></video>` :
        `<img src="${post.media_url}" alt="${safeCaption(post.caption || 'Instagram post')}" loading="lazy">`
      }
      ${showOverlay ? `<div class="feed-overlay"><div>View on Instagram ↗</div></div>` : ''}
      ${showCaptions && post.caption ? `
        <div class="feed-caption">
          ${safeCaption(post.caption.length > 100 ? post.caption.substring(0, 100) + '...' : post.caption)}
        </div>
      ` : ''}
    </div>
  `).join('') : '<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #666;">No posts available</div>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instagram Feed - @${user.username}</title>
    <meta name="robots" content="noindex">
    ${css}
</head>
<body>
<div class="${feedId}">
  <div class="feed-username">@${user.username}</div>
  ${postsHTML}
</div>
</body>
</html>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '9'), 25);
    const token = params.token;

    if (!token) {
      return new NextResponse('Widget token is required', { status: 400 });
    }

    // Get widget token data from Redis
    const tokenKey = `widget:token:${token}`;
    const tokenData = await redis.get<{
      userId: string;
      username: string;
      instagramUserId: string;
      config: any;
      createdAt: number;
      expiresAt: number;
    }>(tokenKey);
    
    if (!tokenData) {
      return new NextResponse(`
<!DOCTYPE html>
<html><head><title>Widget Error</title></head>
<body style="font-family: Arial; text-align: center; padding: 50px;">
  <h2>Invalid or expired widget token</h2>
</body></html>`, { 
        status: 401,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Check if token is expired
    if (tokenData.expiresAt < Date.now()) {
      await redis.del(tokenKey);
      return new NextResponse(`
<!DOCTYPE html>
<html><head><title>Widget Error</title></head>
<body style="font-family: Arial; text-align: center; padding: 50px;">
  <h2>Widget token has expired</h2>
</body></html>`, { 
        status: 401,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Get user from Redis
    const user = await redis.get<User>(RedisKeys.user(tokenData.userId));
    
    if (!user || !user.isActive) {
      return new NextResponse(`
<!DOCTYPE html>
<html><head><title>Widget Error</title></head>
<body style="font-family: Arial; text-align: center; padding: 50px;">
  <h2>User not found or inactive</h2>
</body></html>`, { 
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Check if Instagram token is expired
    if (user.tokenExpiresAt < Date.now()) {
      return new NextResponse(`
<!DOCTYPE html>
<html><head><title>Widget Error</title></head>
<body style="font-family: Arial; text-align: center; padding: 50px;">
  <h2>Instagram token expired</h2>
</body></html>`, { 
        status: 401,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    const cacheKey = `${RedisKeys.userMedia(tokenData.userId)}:${limit}`;

    // Try to get from cache first
    let postsToRender: InstagramMedia[] = [];
    const cachedMedia = await redis.get<InstagramMedia[]>(cacheKey);
    
    if (cachedMedia && Array.isArray(cachedMedia)) {
      postsToRender = cachedMedia;
      console.log(`Using cached data: ${postsToRender.length} posts`);
    } else {
      console.log('Fetching fresh data from Instagram API');
      // Fetch fresh data from Instagram Graph API
      const mediaResponse = await fetch(
        `https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,username&limit=${limit}&access_token=${user.accessToken}`
      );

      if (!mediaResponse.ok) {
        return new NextResponse(`
<!DOCTYPE html>
<html><head><title>Widget Error</title></head>
<body style="font-family: Arial; text-align: center; padding: 50px;">
  <h2>Failed to fetch Instagram data</h2>
</body></html>`, { 
          status: mediaResponse.status,
          headers: { 'Content-Type': 'text/html' }
        });
      }

      const mediaData = await mediaResponse.json();
      postsToRender = mediaData.data || [];

      // Cache for 5 minutes
      if (postsToRender.length > 0) {
        await redis.set(cacheKey, postsToRender, { ex: 300 });
        console.log(`Cached ${postsToRender.length} posts for user ${tokenData.userId}`);
      }
    }

    // Generate HTML widget
    const html = generateWidgetHTML(postsToRender, {
      username: user.username,
      id: user.instagramUserId,
      media_count: user.mediaCount,
    }, tokenData.config);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': 'frame-ancestors *;',
      },
    });

  } catch (error) {
    console.error('Widget HTML error:', error);
    return new NextResponse(`
<!DOCTYPE html>
<html><head><title>Widget Error</title></head>
<body style="font-family: Arial; text-align: center; padding: 50px;">
  <h2>Internal server error</h2>
</body></html>`, { 
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}