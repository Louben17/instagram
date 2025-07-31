'use client';

import { useState, useEffect } from 'react';
import { User, Instagram, RefreshCw, LogOut, Copy, Check, ExternalLink } from 'lucide-react';

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
  cached: boolean;
  fetch_time: string;
}

export default function Dashboard() {
  const [feedData, setFeedData] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const apiUrl = `${window.location.origin}/api/feed`;

  const fetchFeed = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/feed');
      
      if (!response.ok) {
        if (response.status === 401) {
          const errorData = await response.json();
          if (errorData.reauth_required) {
            window.location.href = '/login';
            return;
          }
        }
        throw new Error(`Failed to fetch feed: ${response.status}`);
      }
      
      const data = await response.json();
      setFeedData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch feed');
    } finally {
      setLoading(false);
    }
  };

  const copyApiUrl = () => {
    navigator.clipboard.writeText(apiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const logout = () => {
    // Simple logout - redirect to login
    window.location.href = '/login';
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-10 h-10 rounded-full flex items-center justify-center">
              <Instagram className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Instagram Feed Dashboard</h1>
              {feedData && (
                <p className="text-sm text-gray-600">@{feedData.user.username}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchFeed}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
              <span>Refresh</span>
            </button>
            
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* API Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ExternalLink className="mr-2" size={20} />
            Your Instagram Feed API
          </h2>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <code className="text-sm text-gray-700 break-all">{apiUrl}</code>
              <button
                onClick={copyApiUrl}
                className="ml-4 flex items-center space-x-1 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mt-2">
            Use this URL to fetch your Instagram feed in JSON format. Authentication is handled automatically.
          </p>
        </div>

        {/* Stats */}
        {feedData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <User className="text-blue-500 mr-3" size={24} />
                <div>
                  <p className="text-sm text-gray-600">Username</p>
                  <p className="text-lg font-semibold">@{feedData.user.username}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <Instagram className="text-pink-500 mr-3" size={24} />
                <div>
                  <p className="text-sm text-gray-600">Total Media</p>
                  <p className="text-lg font-semibold">{feedData.user.media_count}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <RefreshCw className="text-green-500 mr-3" size={24} />
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="text-lg font-semibold">
                    {feedData.cached ? 'Cached' : 'Fresh'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="animate-spin text-gray-400" size={32} />
            <span className="ml-3 text-gray-600">Loading Instagram feed...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 font-medium">Error loading feed</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
            <button
              onClick={fetchFeed}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Try Again
            </button>
          </div>
        )}

        {feedData && !loading && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Recent Posts</h2>
              <p className="text-sm text-gray-600 mt-1">
                Showing {feedData.data.length} recent posts from your Instagram feed
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {feedData.data.map((post) => (
                <div key={post.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gray-100">
                    {post.media_type === 'VIDEO' ? (
                      <video
                        src={post.media_url}
                        poster={post.thumbnail_url}
                        className="w-full h-full object-cover"
                        controls
                      />
                    ) : (
                      <img
                        src={post.media_url}
                        alt={post.caption || 'Instagram post'}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {post.media_type}
                      </span>
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 text-xs"
                      >
                        View on Instagram ↗
                      </a>
                    </div>
                    
                    {post.caption && (
                      <p className="text-sm text-gray-700 line-clamp-3">
                        {post.caption.length > 100 
                          ? `${post.caption.substring(0, 100)}...` 
                          : post.caption
                        }
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(post.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}