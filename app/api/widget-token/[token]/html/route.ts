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
  transition: transform 0.3s ease;
  background: #f0f0f0;
}
${hoverEffect === 'zoom' ? `.${feedId} .feed-item:hover { transform: scale(1.05); }` : ''}
${hoverEffect === 'lift' ? `.${feedId} .feed-item:hover { transform: translateY(-4px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }` : ''}
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
  transition: opacity 0.3s ease;
  color: white;
  font-size: 14px;
  text-align: center;
  padding: 12px;
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
  padding: 12px;
  font-size: 12px;
  line-height: 1.3;
  max-height: 60%;
  overflow: hidden;
  display: ${showCaptions ? 'block' : 'none'};
  box-sizing: border-box;
}
.${feedId} .feed-username {
  text-align: center;
  margin-bottom: ${spacing}px;
  font-weight: 600;
  color: ${captionColor};
  font-size: 18px;
  grid-column: 1 / -1;
}
.${feedId} .feed-error {
  grid-column: 1 / -1;
  text-align: center;
  padding: 20px;
  color: #666;
  background: #f9f9f9;
  border-radius: ${borderRadius}px;
}
@media (max-width: 768px) {
  .${feedId} { 
    grid-template-columns: repeat(${Math.min(columns, 2)}, 1fr); 
    padding: ${Math.max(spacing / 2, 4)}px;
  }
}
@media (max-width: 480px) {
  .${feedId} { 
    grid-template-columns: repeat(1, 1fr); 
    padding: ${Math.max(spacing / 2, 4)}px;
  }
}
</style>`;

  const safeCaption = (caption: string) => 
    caption.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const postsHTML = displayPosts.length > 0 ? displayPosts.map(post => `
    <div class="feed-item" onclick="window.open('${post.permalink}', '_blank')" role="button" tabindex="0">
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
  `).join('') : '<div class="feed-error">No posts available</div>';

  const html = `<!DOCTYPE html>
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
<script>
// Handle keyboard navigation
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && e.target.classList.contains('feed-item')) {
    e.target.click();
  }
});
</script>
</body>
</html>`;

  return html;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '9'), 25);
    const token = params.token;

    console.log(`Widget HTML request for token: ${token}, limit: ${limit}`);

    if (!token) {
      console.error('No token provided');
      return new NextResponse('Widget token is required', { 
        status: 400,
        headers: {
          'Content-Type': 'text/html',
          'X-Frame-Options': 'ALLOWALL',
          'Content-Security-Policy': 'frame-ancestors *;',
        }
      });
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
    
    console.log(`Token data for ${token}:`, tokenData ? 'found' : 'not found');
    
    if (!tokenData) {
      return new NextResponse(`
<!DOCTYPE html>
<html><head><title>Widget Error</title></head>
<body style="font-family: Arial; text-align: center; padding: 50px;">
  <h2>Invalid or expired widget token</h2>
  <p>Token: ${token}</p>
</body></html>`, { 
        status: 401,
        headers: {
          'Content-Type': 'text/html',
          'X-Frame-Options': 'ALLOWALL',
          'Content-Security-Policy': 'frame-ancestors *;',
        }
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
  <p>Please generate a new widget token</p>
</body></html>`, { 
        status: 401,
        headers: {
          'Content-Type': 'text/html',
          'X-Frame-Options': 'ALLOWALL',
          'Content-Security-Policy': 'frame-ancestors *;',
        }
      });
    }

    // Get user from Redis
    const user = await redis.get<User>(RedisKeys.user(tokenData.userId));
    
    console.log(`User data for ${tokenData.userId}:`, user ? 'found' : 'not found');
    
    if (!user || !user.isActive) {
      return new NextResponse(`
<!DOCTYPE html>
<html><head><title>Widget Error</title></head>
<body style="font-family: Arial; text-align: center; padding: 50px;">
  <h2>User not found or inactive</h2>
</body></html>`, { 
        status: 404,
        headers: {
          'Content-Type': 'text/html',
          'X-Frame-Options': 'ALLOWALL',
          'Content-Security-Policy': 'frame-ancestors *;',
        }
      });
    }

    // Check if Instagram token is expired
    if (user.tokenExpiresAt < Date.now()) {
      return new NextResponse(`
<!DOCTYPE html>
<html><head><title>Widget Error</title></head>
<body style="font-family: Arial; text-align: center; padding: 50px;">
  <h2>Instagram token expired</h2>
  <p>The user needs to reconnect their Instagram account</p>
</body></html>`, { 
        status: 401,
        headers: {
          'Content-Type': 'text/html',
          'X-Frame-Options': 'ALLOWALL',
          'Content-Security-Policy': 'frame-ancestors *;',
        }
      });
    }

    const cacheKey = `${RedisKeys.userMedia(tokenData.userId)}:${limit}`;

    // Try to get from cache first
    let cachedMedia = await redis.get<InstagramMedia[]>(cacheKey);
    
    if (!cachedMedia) {
      console.log('Fetching fresh data from Instagram API');
      // Fetch fresh data from Instagram Graph API
      const mediaResponse = await fetch(
        `https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,username&limit=${limit}&access_token=${user.accessToken}`
      );

      if (!mediaResponse.ok) {
        const errorText = await mediaResponse.text();
        console.error('Instagram API error:', errorText);
        
        return new NextResponse(`
<!DOCTYPE html>
<html><head><title>Widget Error</title></head>
<body style="font-family: Arial; text-align: center; padding: 50px;">
  <h2>Failed to fetch Instagram data</h2>
  <p>Status: ${mediaResponse.status}</p>
</body></html>`, { 
          status: mediaResponse.status,
          headers: {
            'Content-Type': 'text/html',
            'X-Frame-Options': 'ALLOWALL',
            'Content-Security-Policy': 'frame-ancestors *;',
          }
        });
      }

const mediaData = await mediaResponse.json();
cachedMedia = mediaData.data || [];

// Cache for 5 minutes
await redis.set(cacheKey, cachedMedia, { ex: 300 });
console.log(`Cached ${cachedMedia.length} posts for user ${tokenData.userId}`);
} else {
console.log(`Using cached data: ${cachedMedia.length} posts`);
}

// Generate HTML widget
const html = generateWidgetHTML(cachedMedia || [], {
      username: user.username,
      id: user.instagramUserId,
      media_count: user.mediaCount,
    }, tokenData.config);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': 'frame-ancestors *;',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Widget HTML error:', error);
    return new NextResponse(`
<!DOCTYPE html>
<html><head><title>Widget Error</title></head>
<body style="font-family: Arial; text-align: center; padding: 50px;">
  <h2>Internal server error</h2>
  <p>Please try again later</p>
</body></html>`, { 
      status: 500,
      headers: {
        'Content-Type': 'text/html',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': 'frame-ancestors *;',
      }
    });
  }
}