'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface InstagramPost {
  id: string;
  html: string;
  thumbnail_url?: string;
  author_name?: string;
  width?: number;
  height?: number;
}

interface WidgetConfig {
  layout: 'grid' | 'slider' | 'masonry';
  columns: number;
  spacing: number;
  showCaptions: boolean;
  borderRadius: number;
}

interface WidgetData {
  posts: InstagramPost[];
  config: WidgetConfig;
}

export default function EmbedPage() {
  const params = useParams();
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWidget = async () => {
      try {
        const response = await fetch(`/api/instagram?id=${params.id}`);
        const result = await response.json();
        
        if (result.success) {
          setWidgetData(result.data);
        } else {
          setError(result.error || 'Nepodařilo se načíst widget');
        }
      } catch (err) {
        setError('Chyba při načítání widgetu');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchWidget();
    }
  }, [params.id]);

  useEffect(() => {
    // Načtení Instagram embed script
    if (widgetData && typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;
      document.body.appendChild(script);

      // Znovu inicializace embedů po načtení
      script.onload = () => {
        if ((window as any).instgrm) {
          (window as any).instgrm.Embeds.process();
        }
      };

      return () => {
        document.body.removeChild(script);
      };
    }
  }, [widgetData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600">Načítám Instagram widget...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4 p-6">
          <div className="text-red-500 text-6xl">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800">Chyba při načítání</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!widgetData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4 p-6">
          <div className="text-gray-400 text-6xl">📱</div>
          <h2 className="text-xl font-semibold text-gray-800">Widget nenalezen</h2>
          <p className="text-gray-600">Požadovaný Instagram widget neexistuje.</p>
        </div>
      </div>
    );
  }

  const { posts, config } = widgetData;

  return (
    <div className="min-h-screen bg-white p-1 sm:p-2">
      <div className="max-w-6xl mx-auto">
        <style jsx global>{`
          .instagram-feed-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 4px;
            width: 100%;
          }
          
          @media (max-width: 1024px) {
            .instagram-feed-grid {
              grid-template-columns: repeat(4, 1fr);
            }
          }
          
          @media (max-width: 768px) {
            .instagram-feed-grid {
              grid-template-columns: repeat(3, 1fr);
              gap: 3px;
            }
          }
          
          @media (max-width: 480px) {
            .instagram-feed-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 2px;
            }
          }
          
          .ig-post-clean {
            position: relative;
            background: white;
            border-radius: 4px;
            overflow: hidden;
            transition: transform 0.2s ease;
            cursor: pointer;
          }
          
          .ig-post-clean:hover {
            transform: scale(1.02);
          }
          
          @media (max-width: 768px) {
            .ig-post-clean {
              border-radius: 2px;
            }
            
            .ig-post-clean:hover {
              transform: none;
            }
          }
        `}</style>

        <div className="instagram-feed-grid">
          {posts.map((post, index) => (
            <div
              key={post.id || index}
              className="ig-post-container"
              dangerouslySetInnerHTML={{ __html: post.html }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}