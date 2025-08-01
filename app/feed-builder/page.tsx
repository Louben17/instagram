'use client';

import { useState, useEffect } from 'react';
import { Settings, Code, Eye, Copy, Check, Download, Grid, AlertCircle } from 'lucide-react';

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
  const [isClient, setIsClient] = useState(false);
  const [feedData, setFeedData] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'preview' | 'iframe' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Widget token states
  const [widgetToken, setWidgetToken] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  
  const [config, setConfig] = useState<FeedConfig>({
    columns: 5,      // 5 příspěvků vedle sebe
    rows: 1,         // Jen 1 řádek pro čistý look
    spacing: 4,      // Malé mezery
    borderRadius: 6, // Lehce kulaté rohy
    showCaptions: false,    // Bez popisků pro čistý look
    showOverlay: false,     // Bez overlay pro čistý look
    hoverEffect: 'zoom',
    backgroundColor: '#ffffff',
    captionColor: '#374151',
    overlayColor: 'rgba(0,0,0,0.7)',
    width: '100%'
  });

  // Ensure client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Generování widget tokenu
  const generateWidgetToken = async () => {
    if (!isClient || generatingToken || widgetToken) return;
    
    setGeneratingToken(true);
    setTokenError(null);
    
    try {
      const response = await fetch('/api/generate-widget-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: config,
          expiresIn: '1y'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setWidgetToken(data.token);
      console.log('Widget token generated:', data.token);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setTokenError(errorMessage);
      console.error('Failed to generate widget token:', err);
    } finally {
      setGeneratingToken(false);
    }
  };

  // Auto-generování tokenu při přepnutí na iframe tab
  useEffect(() => {
    if (!isClient) return;
    
    if (activeTab === 'iframe' && !widgetToken && !generatingToken && !tokenError && feedData) {
      console.log('Auto-generating widget token...');
      generateWidgetToken();
    }
  }, [activeTab, isClient, widgetToken, generatingToken, tokenError, feedData]);

  // Fetch feed data
  useEffect(() => {
    if (!isClient) return;
    
    const fetchFeed = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/feed?limit=20');
        
        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = '/login';
            return;
          }
          throw new Error(`HTTP ${response.status}: Failed to fetch feed`);
        }
        
        const data = await response.json();
        setFeedData(data);
        console.log('Feed data loaded:', data);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Failed to fetch feed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [isClient]);

  const generateHTML = () => {
    if (!feedData || !isClient) return '';

    const posts = feedData.data.slice(0, config.columns * config.rows);
    const feedId = `instagram-feed-${Date.now()}`;

    const css = `<style>
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
  transition: transform 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
${config.hoverEffect === 'zoom' ? `.${feedId} .feed-item:hover { transform: scale(1.03); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }` : ''}
${config.hoverEffect === 'lift' ? `.${feedId} .feed-item:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }` : ''}
.${feedId} .feed-item img, .${feedId} .feed-item video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.${feedId} .feed-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: ${config.overlayColor};
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  color: white;
  font-size: 12px;
  text-align: center;
  padding: 8px;
}
.${feedId} .feed-item:hover .feed-overlay {
  opacity: ${config.showOverlay ? '1' : '0'};
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
  display: ${config.showCaptions ? 'block' : 'none'};
}
.${feedId} .feed-username {
  text-align: center;
  margin-bottom: ${config.spacing}px;
  font-weight: 600;
  color: ${config.captionColor};
  font-size: 16px;
  grid-column: 1 / -1;
}
@media (max-width: 768px) {
  .${feedId} { 
    grid-template-columns: repeat(${Math.min(config.columns, 3)}, 1fr); 
    gap: ${Math.max(config.spacing - 1, 2)}px;
  }
}
@media (max-width: 480px) {
  .${feedId} { 
    grid-template-columns: repeat(${Math.min(config.columns, 2)}, 1fr); 
    gap: ${Math.max(config.spacing - 1, 2)}px;
  }
}
</style>`;

    const safeCaption = (caption: string) => 
      caption.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const html = `<div class="${feedId}">
  <div class="feed-username">@${feedData.user.username}</div>
  ${posts.map(post => `
    <div class="feed-item" onclick="window.open('${post.permalink}', '_blank')">
      ${post.media_type === 'VIDEO' ? 
        `<video src="${post.media_url}" poster="${post.thumbnail_url || post.media_url}"></video>` :
        `<img src="${post.media_url}" alt="${safeCaption(post.caption || 'Instagram post')}" loading="lazy">`
      }
      ${config.showOverlay ? `<div class="feed-overlay"><div>View on Instagram ↗</div></div>` : ''}
      ${config.showCaptions && post.caption ? `
        <div class="feed-caption">
          ${safeCaption(post.caption.length > 100 ? post.caption.substring(0, 100) + '...' : post.caption)}
        </div>
      ` : ''}
    </div>
  `).join('')}
</div>`;

    return css + html;
  };

  const generateIFrameCode = () => {
    if (!isClient || !feedData) return '';
    
    const limit = config.columns * config.rows;
    const width = config.width === '100%' ? '100%' : `${config.width}px`;
    const height = Math.ceil((200 * config.rows) + (config.spacing * (config.rows + 1)) + 40);
    
    // Use token-based HTML renderer if available, otherwise fallback to data URI
    const iframeUrl = widgetToken 
      ? `${window.location.origin}/api/widget-token/${widgetToken}/html?limit=${limit}`
      : (() => {
          // Fallback to data URI for immediate use
          const htmlContent = generateHTML();
          const encodedHtml = encodeURIComponent(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instagram Feed - @${feedData.user.username}</title>
</head>
<body style="margin: 0; padding: 0;">
    ${htmlContent}
</body>
</html>`);
          return `data:text/html,${encodedHtml}`;
        })();
    
    console.log('Generated iframe URL:', iframeUrl);
    
    return `<iframe 
  src="${iframeUrl}"
  width="${width}" 
  height="${height}px"
  frameborder="0"
  scrolling="no"
  style="border: none; border-radius: ${config.borderRadius}px; overflow: hidden;"
  title="Instagram Feed - @${feedData.user.username}"
  loading="lazy">
</iframe>`;
  };

  const copyCode = () => {
    if (!isClient) return;
    const codeToUse = activeTab === 'iframe' ? generateIFrameCode() : generateHTML();
    if (codeToUse) {
      navigator.clipboard.writeText(codeToUse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadHTML = () => {
    if (!isClient) return;
    
    const isIframe = activeTab === 'iframe';
    const code = isIframe ? generateIFrameCode() : generateHTML();
    const filename = isIframe ? 
      `instagram-iframe-${feedData?.user.username}.html` : 
      `instagram-feed-${feedData?.user.username}.html`;
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instagram Feed - @${feedData?.user.username}</title>
</head>
<body>
    <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1>Instagram Feed - @${feedData?.user.username}</h1>
        ${code}
    </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Show loading until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-2">Failed to load Instagram feed</p>
          {error && (
            <p className="text-sm text-gray-600 mb-4 bg-red-50 p-2 rounded">
              Error: {error}
            </p>
          )}
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
          >
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
              <Grid className="text-pink-500" size={24} />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Instagram Feed Builder</h1>
                <p className="text-sm text-gray-600">Create beautiful embeddable Instagram feeds</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <a
                href="/dashboard"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center space-x-2"
              >
                <span>Dashboard</span>
              </a>
              
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
                  onClick={() => setActiveTab('iframe')}
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                    activeTab === 'iframe' ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  <span>IFrame</span>
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                    activeTab === 'code' ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  <Code size={16} />
                  <span>HTML</span>
                </button>
              </div>
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
                        onChange={(e) => setConfig({...config, columns: parseInt(e.target.value) || 1})}
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
                        onChange={(e) => setConfig({...config, rows: parseInt(e.target.value) || 1})}
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

                {/* Token Status for iframe tab */}
                {activeTab === 'iframe' && (
                  <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Widget Token Status</h4>
                    {generatingToken ? (
                      <div className="flex items-center space-x-2 text-blue-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-xs">Generating...</span>
                      </div>
                    ) : widgetToken ? (
                      <div className="flex items-center space-x-2 text-green-600">
                        <Check size={16} />
                        <span className="text-xs">Dynamic Token Ready</span>
                      </div>
                    ) : tokenError ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-red-600">
                          <AlertCircle size={16} />
                          <span className="text-xs">Token Error</span>
                        </div>
                        <p className="text-xs text-red-600">{tokenError}</p>
                        <button
                          onClick={generateWidgetToken}
                          className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={generateWidgetToken}
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                      >
                        Generate Dynamic Token
                      </button>
                    )}
                  </div>
                )}
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
                
                {/* Safe preview without dangerouslySetInnerHTML */}
                <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg">
                  <div 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${config.columns}, 1fr)`,
                      gap: `${config.spacing}px`,
                      background: config.backgroundColor,
                      padding: `${config.spacing}px`,
                      borderRadius: `${config.borderRadius}px`,
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}
                  >
                    <div style={{ 
                      textAlign: 'center', 
                      gridColumn: '1 / -1',
                      marginBottom: `${config.spacing}px`,
                      fontWeight: 600,
                      color: config.captionColor,
                      fontSize: '18px'
                    }}>
                      @{feedData.user.username}
                    </div>
                    
                    {feedData.data.slice(0, config.columns * config.rows).map((post) => (
                      <div
                        key={post.id}
                        style={{
                          position: 'relative',
                          aspectRatio: '1',
                          overflow: 'hidden',
                          borderRadius: `${config.borderRadius}px`,
                          cursor: 'pointer'
                        }}
                        onClick={() => window.open(post.permalink, '_blank')}
                      >
                        {post.media_type === 'VIDEO' ? (
                          <video
                            src={post.media_url}
                            poster={post.thumbnail_url || post.media_url}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <img
                            src={post.media_url}
                            alt={post.caption || 'Instagram post'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        )}
                        
                        {config.showCaptions && post.caption && (
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                            color: 'white',
                            padding: '12px',
                            fontSize: '12px',
                            lineHeight: 1.3,
                            maxHeight: '60%',
                            overflow: 'hidden'
                          }}>
                            {post.caption.length > 100 ? post.caption.substring(0, 100) + '...' : post.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeTab === 'iframe' ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="mb-6 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {widgetToken ? 'Dynamic IFrame Embed Code' : 'IFrame Embed Code (Static)'}
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={copyCode}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      <span>{copied ? 'Copied!' : 'Copy IFrame'}</span>
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
                
                <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
                  <pre className="text-green-400 text-sm whitespace-pre-wrap">
                    <code>{generateIFrameCode()}</code>
                  </pre>
                </div>
                
                {widgetToken ? (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2 text-green-800">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">Dynamic Widget Active!</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      This widget automatically updates with your latest Instagram posts! Token expires in 1 year.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-2 text-yellow-800">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">Static IFrame (Fallback)</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      This iframe contains your current posts. Generate a dynamic token above for auto-updating feed.
                    </p>
                  </div>
                )}
                
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2 flex items-center">
                      ✅ {widgetToken ? 'Dynamic' : 'Static'} IFrame Features
                    </h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      {widgetToken ? (
                        <>
                          <li>• Automatically updates with new posts</li>
                          <li>• Works in any website or iframe</li>
                          <li>• Secure token-based authentication</li>
                          <li>• No cookies required</li>
                        </>
                      ) : (
                        <>
                          <li>• Works immediately, no server needed</li>
                          <li>• Self-contained, no external dependencies</li>
                          <li>• Fast loading with data URI</li>
                          <li>• No authentication issues</li>
                        </>
                      )}
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">How to use:</h4>
                    <ol className="text-sm text-blue-800 space-y-1">
                      <li>1. Copy the IFrame code above</li>
                      <li>2. Paste it into your website HTML</li>
                      <li>3. {widgetToken ? 'Feed updates automatically!' : 'Works immediately!'}</li>
                      <li>4. {widgetToken ? 'Token is valid for 1 year' : 'Regenerate for new posts'}</li>
                    </ol>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="mb-6 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Static HTML Code</h3>
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
                
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-semibold text-yellow-900 mb-2 flex items-center">
                      ⚠️ Static HTML Limitations
                    </h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• Shows current posts only</li>
                      <li>• No automatic updates</li>
                      <li>• Need to regenerate for new posts</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">How to use:</h4>
                    <ol className="text-sm text-blue-800 space-y-1">
                      <li>1. Copy the HTML code above</li>
                      <li>2. Paste it into your website</li>
                      <li>3. Regenerate when you want updates</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}