'use client';

import { useState, useEffect } from 'react';
import { Settings, Code, Eye, Copy, Check, Download, Palette, Grid3X3, Users, Heart } from 'lucide-react';

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

interface FeedConfig {
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
  width: string;
}

export default function FeedBuilder() {
  const [feedData, setFeedData] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  
  const [config, setConfig] = useState<FeedConfig>({
    columns: 3,
    rows: 3,
    spacing: 8,
    borderRadius: 8,
    showCaptions: true,
    showOverlay: true,
    hoverEffect: 'zoom',
    backgroundColor: '#ffffff',
    captionColor: '#374151',
    overlayColor: 'rgba(0,0,0,0.7)',
    width: '100%'
  });

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/feed?limit=20');
      
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch feed');
      }
      
      const data = await response.json();
      setFeedData(data);
    } catch (err) {
      console.error('Failed to fetch feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const generateHTML = () => {
    if (!feedData) return '';

    const posts = feedData.data.slice(0, config.columns * config.rows);
    const feedId = `instagram-feed-${Date.now()}`;

    const css = `
<style>
.${feedId} {
  display: grid;
  grid-template-columns: repeat(${config.columns}, 1fr);
  gap: ${config.spacing}px;
  width: ${config.width};
  max-width: 100%;
  background: ${config.backgroundColor};
  padding: ${config.spacing}px;
  border-radius: ${config.borderRadius}px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.${feedId} .feed-item {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: ${config.borderRadius}px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

${config.hoverEffect === 'zoom' ? `
.${feedId} .feed-item:hover {
  transform: scale(1.05);
}
` : ''}

${config.hoverEffect === 'lift' ? `
.${feedId} .feed-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}
` : ''}

.${feedId} .feed-item img,
.${feedId} .feed-item video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.${feedId} .feed-overlay {
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

.${feedId} .feed-item:hover .feed-overlay {
  opacity: ${config.showOverlay ? '1' : '0'};
}

.${feedId} .feed-caption {
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
  display: ${config.showCaptions ? 'block' : 'none'};
}

.${feedId} .feed-username {
  text-align: center;
  margin-bottom: ${config.spacing}px;
  font-weight: 600;
  color: ${config.captionColor};
  font-size: 18px;
}

@media (max-width: 768px) {
  .${feedId} {
    grid-template-columns: repeat(${Math.min(config.columns, 2)}, 1fr);
  }
}

@media (max-width: 480px) {
  .${feedId} {
    grid-template-columns: repeat(1, 1fr);
  }
}
</style>`;

    const html = `
<div class="${feedId}">
  <div class="feed-username">@${feedData.user.username}</div>
  ${posts.map(post => `
    <div class="feed-item" onclick="window.open('${post.permalink}', '_blank')">
      ${post.media_type === 'VIDEO' ? 
        `<video src="${post.media_url}" poster="${post.thumbnail_url || post.media_url}"></video>` :
        `<img src="${post.media_url}" alt="${post.caption || 'Instagram post'}" loading="lazy">`
      }
      ${config.showOverlay ? `
        <div class="feed-overlay">
          <div>View on Instagram ↗</div>
        </div>
      ` : ''}
      ${config.showCaptions && post.caption ? `
        <div class="feed-caption">
          ${post.caption.length > 100 ? post.caption.substring(0, 100) + '...' : post.caption}
        </div>
      ` : ''}
    </div>
  `).join('')}
</div>`;

    return css + html;
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generateHTML());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadHTML = () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instagram Feed - @${feedData?.user.username}</title>
</head>
<body>
    ${generateHTML()}
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instagram-feed-${feedData?.user.username}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your Instagram feed...</p>
        </div>
      </div>
    );
  }

  if (!feedData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load Instagram feed</p>
          <button onClick={fetchFeed} className="mt-4 px-4 py-2 bg-pink-500 text-white rounded-lg">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Grid3X3 className="text-pink-500" size={24} />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Instagram Feed Builder</h1>
                <p className="text-sm text-gray-600">Create beautiful embeddable Instagram feeds</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                  activeTab === 'preview' ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                <Eye size={16} />
                <span>Preview</span>
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                  activeTab === 'code' ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                <Code size={16} />
                <span>Code</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Settings Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="mr-2" size={20} />
                Customize Feed
              </h3>

              {/* Grid Settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grid Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Columns</label>
                      <input
                        type="number"
                        min="1"
                        max="6"
                        value={config.columns}
                        onChange={(e) => setConfig({...config, columns: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Rows</label>
                      <input
                        type="number"
                        min="1"
                        max="6"
                        value={config.rows}
                        onChange={(e) => setConfig({...config, rows: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Spacing</label>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    value={config.spacing}
                    onChange={(e) => setConfig({...config, spacing: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-500">{config.spacing}px</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Border Radius</label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={config.borderRadius}
                    onChange={(e) => setConfig({...config, borderRadius: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-500">{config.borderRadius}px</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hover Effect</label>
                  <select
                    value={config.hoverEffect}
                    onChange={(e) => setConfig({...config, hoverEffect: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="none">None</option>
                    <option value="zoom">Zoom</option>
                    <option value="lift">Lift</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Colors</label>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-500">Background</label>
                      <input
                        type="color"
                        value={config.backgroundColor}
                        onChange={(e) => setConfig({...config, backgroundColor: e.target.value})}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Text Color</label>
                      <input
                        type="color"
                        value={config.captionColor}
                        onChange={(e) => setConfig({...config, captionColor: e.target.value})}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.showCaptions}
                      onChange={(e) => setConfig({...config, showCaptions: e.target.checked})}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Show Captions</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.showOverlay}
                      onChange={(e) => setConfig({...config, showOverlay: e.target.checked})}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Show Hover Overlay</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Preview/Code Panel */}
          <div className="lg:col-span-3">
            {activeTab === 'preview' ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="mb-6 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Live Preview</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={copyCode}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      <span>{copied ? 'Copied!' : 'Copy HTML'}</span>
                    </button>
                    <button
                      onClick={downloadHTML}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-2"
                    >
                      <Download size={16} />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
                
                <div 
                  className="border-2 border-dashed border-gray-300 p-4 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: generateHTML() }}
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="mb-6 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">HTML Code</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={copyCode}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                    <button
                      onClick={downloadHTML}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-2"
                    >
                      <Download size={16} />
                      <span>Download HTML</span>
                    </button>
                  </div>
                </div>
                
                <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
                  <pre className="text-green-400 text-sm">
                    <code>{generateHTML()}</code>
                  </pre>
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">How to use:</h4>
                  <ol className="text-sm text-blue-800 space-y-1">
                    <li>1. Copy the HTML code above</li>
                    <li>2. Paste it into your website where you want the feed to appear</li>
                    <li>3. The feed will automatically update with your latest Instagram posts</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}