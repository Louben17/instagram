'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

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

interface FeedData {
  data: InstagramMedia[];
  user: {
    username: string;
    id: string;
    media_count: number;
  };
}

interface WidgetConfig {
  columns: number;
  rows: number;
  spacing: number;
  borderRadius: number;
  showCaptions: boolean;
  showOverlay: boolean;
  hoverEffect: string;
  backgroundColor: string;
  captionColor: string;
  overlayColor: string;
  showUsername: boolean;
}

export default function CurrentUserWidget() {
  const searchParams = useSearchParams();
  
  const [feedData, setFeedData] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse URL parameters for widget configuration
  const config: WidgetConfig = {
    columns: parseInt(searchParams.get('columns') || '3'),
    rows: parseInt(searchParams.get('rows') || '3'),
    spacing: parseInt(searchParams.get('spacing') || '8'),
    borderRadius: parseInt(searchParams.get('borderRadius') || '8'),
    showCaptions: searchParams.get('showCaptions') === 'true',
    showOverlay: searchParams.get('showOverlay') !== 'false',
    hoverEffect: searchParams.get('hoverEffect') || 'zoom',
    backgroundColor: searchParams.get('backgroundColor') || '#ffffff',
    captionColor: searchParams.get('captionColor') || '#374151',
    overlayColor: searchParams.get('overlayColor') || 'rgba(0,0,0,0.7)',
    showUsername: searchParams.get('showUsername') !== 'false',
  };

  const fetchFeed = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const limit = config.columns * config.rows;
      // Use the same endpoint as the main feed, with credentials
      const response = await fetch(`/api/feed?limit=${limit}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to view this Instagram feed');
        }
        throw new Error(`Failed to load feed: ${response.status}`);
      }
      
      const data = await response.json();
      setFeedData(data);
    } catch (err) {
      console.error('Widget fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
    
    // Auto-refresh every 15 minutes
    const interval = setInterval(fetchFeed, 15 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="widget-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading Instagram feed...</p>
        </div>
        
        <style jsx>{`
          .widget-container {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: ${config.spacing}px;
            background: ${config.backgroundColor};
            min-height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .loading-state {
            text-align: center;
            color: #666;
          }
          
          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #e91e63;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 12px;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          p {
            margin: 0;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="widget-container">
        <div className="error-state">
          <p>Instagram feed unavailable</p>
          <small>{error}</small>
        </div>
        
        <style jsx>{`
          .widget-container {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: ${config.spacing}px;
            background: ${config.backgroundColor};
            min-height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .error-state {
            text-align: center;
            color: #ef4444;
          }
          
          p {
            margin: 0 0 4px;
            font-weight: 500;
          }
          
          small {
            font-size: 12px;
            opacity: 0.8;
          }
        `}</style>
      </div>
    );
  }

  // No data state
  if (!feedData || !feedData.data.length) {
    return (
      <div className="widget-container">
        <div className="empty-state">
          <p>No Instagram posts found</p>
        </div>
        
        <style jsx>{`
          .widget-container {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: ${config.spacing}px;
            background: ${config.backgroundColor};
            min-height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .empty-state {
            text-align: center;
            color: #666;
          }
          
          p {
            margin: 0;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  const posts = feedData.data.slice(0, config.columns * config.rows);

  return (
    <div className="widget-container">
      {config.showUsername && (
        <div className="username">@{feedData.user.username}</div>
      )}
      
      <div className="feed-grid">
        {posts.map((post) => (
          <div 
            key={post.id} 
            className="feed-item"
            onClick={() => window.open(post.permalink, '_blank')}
          >
            {post.media_type === 'VIDEO' ? (
              <video
                src={post.media_url}
                poster={post.thumbnail_url || post.media_url}
                muted
                className="media"
              />
            ) : (
              <img
                src={post.media_url}
                alt={post.caption || 'Instagram post'}
                className="media"
                loading="lazy"
              />
            )}
            
            {config.showOverlay && (
              <div className="overlay">
                <span>View on Instagram ↗</span>
              </div>
            )}
            
            {config.showCaptions && post.caption && (
              <div className="caption">
                {post.caption.length > 100 
                  ? post.caption.substring(0, 100) + '...' 
                  : post.caption
                }
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .widget-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: ${config.spacing}px;
          background: ${config.backgroundColor};
          border-radius: ${config.borderRadius}px;
          width: 100%;
          box-sizing: border-box;
        }
        
        .username {
          text-align: center;
          margin-bottom: ${config.spacing}px;
          font-weight: 600;
          color: ${config.captionColor};
          font-size: 18px;
        }
        
        .feed-grid {
          display: grid;
          grid-template-columns: repeat(${config.columns}, 1fr);
          gap: ${config.spacing}px;
        }
        
        .feed-item {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          border-radius: ${config.borderRadius}px;
          cursor: pointer;
          transition: transform 0.3s ease;
        }
        
        .feed-item:hover {
          transform: ${config.hoverEffect === 'zoom' ? 'scale(1.05)' : 
                       config.hoverEffect === 'lift' ? 'translateY(-4px)' : 'none'};
          ${config.hoverEffect === 'lift' ? 'box-shadow: 0 8px 25px rgba(0,0,0,0.15);' : ''}
        }
        
        .media {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        
        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: ${config.overlayColor};
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
          color: white;
          font-size: 14px;
          text-align: center;
          padding: 12px;
        }
        
        .feed-item:hover .overlay {
          opacity: 1;
        }
        
        .caption {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.8));
          color: white;
          padding: 12px;
          font-size: 12px;
          line-height: 1.3;
          max-height: 60%;
          overflow: hidden;
        }
        
        @media (max-width: 768px) {
          .feed-grid {
            grid-template-columns: repeat(${Math.min(config.columns, 2)}, 1fr);
          }
        }
        
        @media (max-width: 480px) {
          .feed-grid {
            grid-template-columns: repeat(1, 1fr);
          }
        }
      `}</style>
    </div>
  );
}