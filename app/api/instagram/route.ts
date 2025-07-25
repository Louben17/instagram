import { NextRequest, NextResponse } from 'next/server';

interface WidgetConfig {
  layout: 'grid' | 'slider' | 'masonry';
  columns: number;
  spacing: number;
  showCaptions: boolean;
  borderRadius: number;
}

interface InstagramPost {
  id: string;
  html: string;
  thumbnail_url?: string;
  author_name?: string;
  width?: number;
  height?: number;
}

// Simulace databáze s cache expiry - v produkci použijte skutečnou DB
// Používáme global object, aby přežil hot reloads
const globalForWidgets = globalThis as unknown as { 
  widgets: Map<string, { 
    posts: InstagramPost[], 
    config: WidgetConfig,
    createdAt: number,
    lastRefresh: number,
    profileUrl: string // Přidáme pro refresh
  }> 
};
const widgets = globalForWidgets.widgets || (globalForWidgets.widgets = new Map());

// Cache settings
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hodiny
const MAX_WIDGET_AGE = 60 * 24 * 60 * 60 * 1000; // 60 dní

// Funkce pro refresh widget dat
async function refreshWidgetData(widget: any): Promise<any> {
  const instagramToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  
  if (!instagramToken) {
    throw new Error('Instagram token not available for refresh');
  }

  console.log('Refreshing widget data from Instagram API...');

  // Načti fresh data z Instagram API
  const userResponse = await fetch(
    `https://graph.instagram.com/me?fields=id,username,media_count&access_token=${instagramToken}`,
    {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }
  );

  if (!userResponse.ok) {
    throw new Error(`User API failed: ${userResponse.status}`);
  }

  const userData = await userResponse.json();

  const mediaResponse = await fetch(
    `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=5&access_token=${instagramToken}`,
    {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }
  );

  if (!mediaResponse.ok) {
    throw new Error(`Media API failed: ${mediaResponse.status}`);
  }

  const mediaData = await mediaResponse.json();

  // Vytvoř fresh posts
  const posts: InstagramPost[] = mediaData.data.slice(0, 5).map((item: any) => ({
    id: item.id,
    html: `
      <div class="ig-post-clean" style="position: relative; background: white; border-radius: 4px; overflow: hidden; transition: transform 0.2s ease;">
        <a href="${item.permalink}" target="_blank" style="text-decoration: none; display: block;">
          <div style="position: relative; width: 100%; aspect-ratio: 1; overflow: hidden;">
            <img 
              src="${item.media_type === 'VIDEO' ? (item.thumbnail_url || item.media_url) : (item.media_url || item.thumbnail_url)}" 
              alt="Instagram post" 
              style="width: 100%; height: 100%; object-fit: cover; display: block;" 
              loading="lazy"
            />
          </div>
        </a>
      </div>
      
      <style>
        .ig-post-clean:hover {
          transform: scale(1.02);
        }
        
        @media (max-width: 768px) {
          .ig-post-clean:hover {
            transform: none;
          }
        }
      </style>
    `,
    thumbnail_url: item.media_url || item.thumbnail_url,
    author_name: userData.username,
    width: 300,
    height: 300
  }));

  return { posts };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('API Request body:', body);
    
    const { url, config } = body;
    
    // Validace URL
    if (!url) {
      console.log('No URL provided');
      return NextResponse.json({ error: 'URL je povinná' }, { status: 400 });
    }

    console.log('Processing URL:', url);

    // Extrakce post ID z URL
    let postId = '';
    let instagramUrl = '';
    
    if (url.includes('instagram.com/p/')) {
      const match = url.match(/instagram\.com\/p\/([^\/\?]+)/);
      if (match) {
        postId = match[1];
        instagramUrl = `https://www.instagram.com/p/${postId}/`;
        console.log('Extracted post ID:', postId);
      }
    } else if (url.startsWith('@')) {
      // Pro username - zatím mock data
      postId = 'mock_' + Math.random().toString(36).substr(2, 9);
      instagramUrl = `https://www.instagram.com/${url.replace('@', '')}/`;
      console.log('Username provided:', url);
    } else {
      console.log('Invalid URL format:', url);
      // Zkusíme to i tak s mock daty
      postId = 'mock_' + Math.random().toString(36).substr(2, 9);
      instagramUrl = url;
    }

    // Test Instagram Business API s vaším tokenem
    if (url.includes('instagram.com/') && !url.includes('/p/')) {
      console.log('Trying Instagram Business API for profile:', url);
      
      // Extraktujeme username z URL
      const usernameMatch = url.match(/instagram\.com\/([^\/\?]+)/);
      const username = usernameMatch ? usernameMatch[1] : url.replace('@', '');
      
      console.log('Extracted username:', username);
      
      // Instagram token z Vercel environment variables
      const instagramToken = process.env.INSTAGRAM_ACCESS_TOKEN;
      
      if (!instagramToken) {
        console.log('No Instagram token found - using fallback for local development');
        // V produkci na Vercel bude token, lokálně použijeme fallback
        throw new Error('Instagram token not configured');
      }
      
      console.log('Instagram token found:', instagramToken.substring(0, 10) + '...');
      
      try {
        console.log('Testing Instagram Graph API...');
        
        // Jednoduchý token handling bez external class
        const instagramToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        
        if (!instagramToken) {
          console.log('No Instagram token found - using fallback for local development');
          throw new Error('Instagram token not configured');
        }
        
        console.log('Instagram token found:', instagramToken.substring(0, 10) + '...');
        
        // Test 1: Získání základních informací o účtu
        const userResponse = await fetch(
          `https://graph.instagram.com/me?fields=id,username,media_count&access_token=${instagramToken}`,
          {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          }
        );

        console.log('User API response status:', userResponse.status);

        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('User data:', userData);
          
          // Test 2: Získání nejnovějších médií
          const mediaResponse = await fetch(
            `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=5&access_token=${instagramToken}`,
            {
              method: 'GET',
              headers: { 'Accept': 'application/json' }
            }
          );

          console.log('Media API response status:', mediaResponse.status);

          if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json();
            console.log('Media data:', {
              count: mediaData.data?.length,
              firstPost: mediaData.data?.[0]
            });

            // Vytvoříme widget z reálných dat - ultra čistý design
            const posts: InstagramPost[] = mediaData.data.slice(0, 5).map((item: any) => ({
              id: item.id,
              html: `
                <div class="ig-post-clean" style="position: relative; background: white; border-radius: 4px; overflow: hidden; transition: transform 0.2s ease;">
                  <a href="${item.permalink}" target="_blank" style="text-decoration: none; display: block;">
                    <div style="position: relative; width: 100%; aspect-ratio: 1; overflow: hidden;">
                      <img 
                        src="${item.media_type === 'VIDEO' ? (item.thumbnail_url || item.media_url) : (item.media_url || item.thumbnail_url)}" 
                        alt="Instagram post" 
                        style="width: 100%; height: 100%; object-fit: cover; display: block;" 
                        loading="lazy"
                      />
                    </div>
                  </a>
                </div>
                
                <style>
                  .ig-post-clean:hover {
                    transform: scale(1.02);
                  }
                  
                  @media (max-width: 768px) {
                    .ig-post-clean:hover {
                      transform: none;
                    }
                  }
                </style>
              `,
              thumbnail_url: item.media_url || item.thumbnail_url,
              author_name: userData.username,
              width: 300,
              height: 300
            }));

            const widgetId = Math.random().toString(36).substr(2, 9);
            const now = Date.now();
            
            widgets.set(widgetId, { 
              posts, 
              config: config || {},
              createdAt: now,
              lastRefresh: now,
              profileUrl: url // Uložíme URL pro refresh
            });

            console.log('Real Instagram Business API widget created:', widgetId);

            return NextResponse.json({ 
              success: true, 
              widgetId,
              message: `🎉 Widget vytvořen z Instagram Business API! Načteno ${posts.length} postů z @${userData.username}`
            });

          } else {
            const mediaError = await mediaResponse.text();
            console.log('Media API error:', mediaError);
          }

        } else {
          const userError = await userResponse.text();
          console.log('User API error:', userError);
        }

      } catch (apiError) {
        console.error('Instagram Business API error:', apiError);
      }
    }

    // Fallback pro jednotlivé posty (původní logika)
    if (instagramUrl.includes('instagram.com/p/')) {
      console.log('Trying Instagram oEmbed API for single post:', instagramUrl);
      
      try {
        const oembedResponse = await fetch(
          `https://api.instagram.com/oembed/?url=${encodeURIComponent(instagramUrl)}&maxwidth=540`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Instagram-Widget-Generator/1.0'
            }
          }
        );

        if (oembedResponse.ok) {
          const responseText = await oembedResponse.text();
          
          if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
            console.log('Instagram returned HTML page instead of JSON - oEmbed might be blocked');
          } else {
            const oembedData = JSON.parse(responseText);
            console.log('Instagram oEmbed API success!');
            
            const post: InstagramPost = {
              id: postId || Math.random().toString(36).substr(2, 9),
              html: oembedData.html,
              thumbnail_url: oembedData.thumbnail_url,
              author_name: oembedData.author_name,
              width: oembedData.width || 540,
              height: oembedData.height || 540
            };

            const widgetId = Math.random().toString(36).substr(2, 9);
            widgets.set(widgetId, { posts: [post], config: config || {} });

            return NextResponse.json({ 
              success: true, 
              widgetId,
              message: '🎉 Widget vytvořen ze skutečného Instagram oEmbed API!'
            });
          }
        }
      } catch (oembedError) {
        console.log('oEmbed API failed, creating fallback');
      }
    }

    // Univerzální fallback
    console.log('Creating fallback widget');
    
    const fallbackPost: InstagramPost = {
      id: postId || Math.random().toString(36).substr(2, 9),
      html: `
        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; max-width: 540px; margin: 10px auto;">
          <a href="${instagramUrl}" target="_blank" style="text-decoration: none; color: inherit; display: block;">
            <div style="width: 100%; height: 300px; background: linear-gradient(45deg, #405de6, #5851db, #833ab4, #c13584, #e1306c, #fd1d1d); display: flex; align-items: center; justify-content: center;">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <div style="padding: 16px;">
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <div style="background: linear-gradient(45deg, #405de6, #5851db, #833ab4, #c13584, #e1306c, #fd1d1d); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <span style="font-weight: 600; font-size: 14px;">Instagram Post</span>
              </div>
              <p style="font-size: 14px; line-height: 1.4; margin: 0; color: #333;">
                📸 Klikněte pro zobrazení na Instagramu
              </p>
              <div style="margin-top: 12px; font-size: 12px; color: #999;">
                Widget Generator • ${new Date().toLocaleDateString('cs-CZ')}
              </div>
            </div>
          </a>
        </div>
      `,
      thumbnail_url: 'https://via.placeholder.com/300x300/E1306C/ffffff?text=IG',
      author_name: 'instagram_post',
      width: 540,
      height: 400
    };

    const widgetId = Math.random().toString(36).substr(2, 9);
    const now = Date.now();
    
    widgets.set(widgetId, { 
      posts: [fallbackPost], 
      config: config || {},
      createdAt: now,
      lastRefresh: now,
      profileUrl: url
    });

    console.log('Fallback widget created:', widgetId);

    return NextResponse.json({ 
      success: true, 
      widgetId,
      message: '📷 Widget vytvořen s odkazem na Instagram!'
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      error: 'Nastala chyba serveru' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const widgetId = searchParams.get('id');
    
    console.log('GET request for widget ID:', widgetId);
    
    if (!widgetId) {
      console.log('No widget ID provided');
      return NextResponse.json({ error: 'Widget ID je povinné' }, { status: 400 });
    }

    const widget = widgets.get(widgetId);
    console.log('Widget found:', !!widget);
    console.log('Available widgets:', Array.from(widgets.keys()));
    
    if (!widget) {
      console.log(`Widget ${widgetId} not found in memory`);
      return NextResponse.json({ error: 'Widget nenalezen' }, { status: 404 });
    }

    const now = Date.now();
    const age = now - widget.createdAt;
    const timeSinceRefresh = now - widget.lastRefresh;

    // Zkontroluj expiraci widgetu (60 dní)
    if (age > MAX_WIDGET_AGE) {
      console.log(`Widget ${widgetId} expired (${Math.round(age / (24 * 60 * 60 * 1000))} days old)`);
      widgets.delete(widgetId);
      return NextResponse.json({ error: 'Widget vypršel platnost' }, { status: 410 });
    }

    // Zkontroluj, jestli potřebuje refresh (2 hodiny)
    if (timeSinceRefresh > CACHE_DURATION && widget.profileUrl) {
      console.log(`Widget ${widgetId} needs refresh (${Math.round(timeSinceRefresh / (60 * 60 * 1000))} hours old)`);
      
      try {
        // Pokus o refresh dat
        const refreshedWidget = await refreshWidgetData(widget);
        if (refreshedWidget) {
          widgets.set(widgetId, {
            ...refreshedWidget,
            createdAt: widget.createdAt, // Zachovej original timestamp
            lastRefresh: now,
            profileUrl: widget.profileUrl,
            config: widget.config
          });
          console.log(`Widget ${widgetId} successfully refreshed`);
          
          return NextResponse.json({ 
            success: true, 
            data: widgets.get(widgetId),
            refreshed: true
          });
        }
      } catch (refreshError) {
        console.error(`Widget ${widgetId} refresh failed:`, refreshError);
        // Pokračuj se starými daty
      }
    }

    console.log('Returning widget data');
    return NextResponse.json({ 
      success: true, 
      data: widget 
    });
    
  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json({ 
      error: 'Chyba při načítání widgetu' 
    }, { status: 500 });
  }
}