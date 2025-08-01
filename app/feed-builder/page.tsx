'use client';

import { useState, useEffect } from 'react';
import { Settings, Code, Eye, Copy, Check, Download, Palette, Grid, Users, Heart, AlertCircle } from 'lucide-react';

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

interface DebugInfo {
  timestamp: string;
  action: string;
  data: any;
  error?: string;
}

export default function FeedBuilder() {
  const [feedData, setFeedData] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'preview' | 'iframe' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [iframeUrl, setIframeUrl] = useState('');
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  
  // Opravené stavy pro widget token
  const [widgetToken, setWidgetToken] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  
  // Debug informace
  const [debugMode, setDebugMode] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  
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

  // Debug funkce
  const addDebugLog = (action: string, data: any, error?: string) => {
    const newLog: DebugInfo = {
      timestamp: new Date().toISOString(),
      action,
      data,
      error
    };
    setDebugLogs(prev => [newLog, ...prev.slice(0, 49)]); // Uchovej posledních 50 logů
    
    if (debugMode) {
      console.log(`[DEBUG] ${action}:`, data, error ? `Error: ${error}` : '');
    }
  };

  // Generování widget tokenu
  const generateWidgetToken = async () => {
    if (generatingToken || widgetToken) return;
    
    setGeneratingToken(true);
    setTokenError(null);
    addDebugLog('generateWidgetToken', { status: 'started' });
    
    try {
      const response = await fetch('/api/widget/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: config,
          expiresIn: '1y' // Token platný 1 rok
        })
      });
      
      addDebugLog('generateWidgetToken', { 
        status: 'response_received',
        ok: response.ok,
        status_code: response.status 
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setWidgetToken(data.token);
      addDebugLog('generateWidgetToken', { status: 'success', token_length: data.token?.length });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setTokenError(errorMessage);
      addDebugLog('generateWidgetToken', { status: 'error' }, errorMessage);
      console.error('Failed to generate widget token:', err);
    } finally {
      setGeneratingToken(false);
    }
  };

  useEffect(() => {
    addDebugLog('component_mount', { config });
    
    // Set URLs only on client side
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setApiUrl(`${origin}/api/feed`);
      addDebugLog('urls_set', { origin, apiUrl: `${origin}/api/feed` });
    }
    
    // Get current user info from feed data
    if (feedData) {
      const params = new URLSearchParams({
        columns: config.columns.toString(),
        rows: config.rows.toString(),
        spacing: config.spacing.toString(),
        borderRadius: config.borderRadius.toString(),
        showCaptions: config.showCaptions.toString(),
        showOverlay: config.showOverlay.toString(),
        hoverEffect: config.hoverEffect,
        backgroundColor: config.backgroundColor,
        captionColor: config.captionColor,
        overlayColor: config.overlayColor,
        showUsername: 'true'
      });
      
      let finalIframeUrl = '';
      
      if (widgetToken) {
        // Použij token-based URL
        finalIframeUrl = `${window.location.origin}/widget/${widgetToken}?${params.toString()}`;
      } else {
        // Fallback na session-based URL
        finalIframeUrl = `${window.location.origin}/widget/current?${params.toString()}`;
      }
      
      setIframeUrl(finalIframeUrl);
      setCurrentUser({ id: 'current', username: feedData.user.username });
      
      addDebugLog('iframe_url_updated', { 
        iframeUrl: finalIframeUrl,
        hasToken: !!widgetToken,
        username: feedData.user.username 
      });
    }
  }, [feedData, config, widgetToken]);

  // Auto-generování tokenu při přepnutí na iframe tab
  useEffect(() => {
    if (activeTab === 'iframe' && !widgetToken && !generatingToken && feedData) {
      addDebugLog('auto_generate_token', { reason: 'iframe_tab_activated' });
      generateWidgetToken();
    }
  }, [activeTab, widgetToken, generatingToken, feedData]);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      setError(null);
      addDebugLog('fetchFeed', { status: 'started' });
      
      const response = await fetch('/api/feed?limit=20');
      
      addDebugLog('fetchFeed', { 
        status: 'response_received',
        ok: response.ok,
        status_code: response.status 
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          addDebugLog('fetchFeed', { status: 'unauthorized', redirecting: true });
          window.location.href = '/login';
          return;
        }
        throw new Error(`HTTP ${response.status}: Failed to fetch feed`);
      }
      
      const data = await response.json();
      setFeedData(data);
      addDebugLog('fetchFeed', { 
        status: 'success',
        posts_count: data.data?.length || 0,
        username: data.user?.username,
        media_count: data.user?.media_count 
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      addDebugLog('fetchFeed', { status: 'error' }, errorMessage);
      console.error('Failed to fetch feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const generateHTML = () => {
    if (!feedData) {
      addDebugLog('generateHTML', { status: 'no_feed_data' });
      return '';
    }

    const posts = feedData.data.slice(0, config.columns * config.rows);
    const feedId = `instagram-feed-${Date.now()}`;

    addDebugLog('generateHTML', { 
      posts_count: posts.length,
      feed_id: feedId,
      config: config 
    });

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

  const generateIFrameCode = () => {
    if (!iframeUrl) {
      addDebugLog('generateIFrameCode', { status: 'no_iframe_url' });
      return '';
    }
    
    const width = config.width === '100%' ? '100%' : `${config.width}px`;
    const height = Math.ceil((200 * config.rows) + (config.spacing * (config.rows + 1)) + 40);
    
    addDebugLog('generateIFrameCode', { 
      iframe_url: iframeUrl,
      width,
      height,
      has_token: !!widgetToken 
    });
    
    return `<iframe 
  src="${iframeUrl}"
  width="${width}" 
  height="${height}px"
  frameborder="0"
  scrolling="no"
  style="border: none; border-radius: ${config.borderRadius}px; overflow: hidden;"
  title="Instagram Feed - @${feedData?.user.username}"
  loading="lazy">
</iframe>`;
  };

  const copyCode = () => {
    const codeToUse = activeTab === 'iframe' ? generateIFrameCode() : generateHTML();
    if (codeToUse) {
      navigator.clipboard.writeText(codeToUse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addDebugLog('copyCode', { tab: activeTab, code_length: codeToUse.length });
    }
  };

  const downloadHTML = () => {
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
    
    addDebugLog('downloadHTML', { filename, is_iframe: isIframe, file_size: html.length });
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
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-2">Failed to load Instagram feed</p>
          {error && (
            <p className="text-sm text-gray-600 mb-4 bg-red-50 p-2 rounded">
              Error: {error}
            </p>
          )}
          <div className="space-x-2">
            <button 
              onClick={fetchFeed} 
              className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
            >
              Retry
            </button>
            <button 
              onClick={() => setDebugMode(!debugMode)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              {debugMode ? 'Hide' : 'Show'} Debug
            </button>
          </div>
          
          {debugMode && (
            <div className="mt-4 max-w-2xl mx-auto">
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-left text-xs max-h-60 overflow-auto">
                <h4 className="text-white mb-2">Debug Logs:</h4>
                {debugLogs.map((log, index) => (
                  <div key={index} className="mb-2">
                    <div className="text-gray-400">[{new Date(log.timestamp).toLocaleTimeString()}] {log.action}</div>
                    <div className="pl-4">{JSON.stringify(log.data, null, 2)}</div>
                    {log.error && <div className="text-red-400 pl-4">Error: {log.error}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
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
              <button
                onClick={() => setDebugMode(!debugMode)}
                className={`px-3 py-1 text-xs rounded ${
                  debugMode ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Debug {debugMode ? 'ON' : 'OFF'}
              </button>
              
              <a
                href="/dashboard"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
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
        {/* Debug Panel */}
        {debugMode && (
          <div className="mb-8 bg-gray-900 text-green-400 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold">Debug Information</h3>
              <button
                onClick={() => setDebugLogs([])}
                className="px-3 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600"
              >
                Clear Logs
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
              <div className="bg-gray-800 p-3 rounded">
                <h4 className="text-white mb-2">Current State</h4>
                <div>Feed Data: {feedData ? '✅' : '❌'}</div>
                <div>Widget Token: {widgetToken ? '✅' : '❌'}</div>
                <div>Generating Token: {generatingToken ? '⏳' : '❌'}</div>
                <div>Active Tab: {activeTab}</div>
                <div>Posts: {feedData?.data?.length || 0}</div>
              </div>
              
              <div className="bg-gray-800 p-3 rounded">
                <h4 className="text-white mb-2">URLs</h4>
                <div className="break-all">API: {apiUrl}</div>
                <div className="break-all">IFrame: {iframeUrl ? '✅' : '❌'}</div>
              </div>
              
              <div className="bg-gray-800 p-3 rounded">
                <h4 className="text-white mb-2">Errors</h4>
                <div>API Error: {error || 'None'}</div>
                <div>Token Error: {tokenError || 'None'}</div>
              </div>
            </div>
            
            <div className="max-h-40 overflow-auto text-xs">
              <h4 className="text-white mb-2">Recent Logs ({debugLogs.length})</h4>
              {debugLogs.slice(0, 10).map((log, index) => (
                <div key={index} className="mb-2 border-l-2 border-gray-600 pl-2">
                  <div className="text-gray-400">
                    [{new Date(log.timestamp).toLocaleTimeString()}] {log.action}
                  </div>
                  <div className="pl-2 text-green-300">
                    {JSON.stringify(log.data, null, 1)}
                  </div>
                  {log.error && (
                    <div className="text-red-400 pl-2">Error: {log.error}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
                        onChange={(e) => {
                          const newConfig = {...config, columns: parseInt(e.target.value)};
                          setConfig(newConfig);
                          addDebugLog('config_change', { field: 'columns', value: parseInt(e.target.value) });
                        }}
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
                        onChange={(e) => {
                          const newConfig = {...config, rows: parseInt(e.target.value)};
                          setConfig(newConfig);
                          addDebugLog('config_change', { field: 'rows', value: parseInt(e.target.value) });
                        }}
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
                    onChange={(e) => {
                      const newConfig = {...config, spacing: parseInt(e.target.value)};
                      setConfig(newConfig);
                      addDebugLog('config_change', { field: 'spacing', value: parseInt(e.target.value) });
                    }}
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
                    onChange={(e) => {
                      const newConfig = {...config, borderRadius: parseInt(e.target.value)};
                      setConfig(newConfig);
                      addDebugLog('config_change', { field: 'borderRadius', value: parseInt(e.target.value) });
                    }}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-500">{config.borderRadius}px</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hover Effect</label>
                  <select
                    value={config.hoverEffect}
                    onChange={(e) => {
                      const newConfig = {...config, hoverEffect: e.target.value};
                      setConfig(newConfig);
                      addDebugLog('config_change', { field: 'hoverEffect', value: e.target.value });
                    }}
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
                        onChange={(e) => {
                          const newConfig = {...config, backgroundColor: e.target.value};
                          setConfig(newConfig);
                          addDebugLog('config_change', { field: 'backgroundColor', value: e.target.value });
                        }}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Text Color</label>
                      <input
                        type="color"
                        value={config.captionColor}
                        onChange={(e) => {
                          const newConfig = {...config, captionColor: e.target.value};
                          setConfig(newConfig);
                          addDebugLog('config_change', { field: 'captionColor', value: e.target.value });
                        }}
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
                      onChange={(e) => {
                        const newConfig = {...config, showCaptions: e.target.checked};
                        setConfig(newConfig);
                        addDebugLog('config_change', { field: 'showCaptions', value: e.target.checked });
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Show Captions</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.showOverlay}
                      onChange={(e) => {
                        const newConfig = {...config, showOverlay: e.target.checked};
                        setConfig(newConfig);
                        addDebugLog('config_change', { field: 'showOverlay', value: e.target.checked });
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Show Hover Overlay</span>
                  </label>
                </div>

                {/* Token Status */}
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
                        <span className="text-xs">Token Ready</span>
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
                        Generate Token
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
                
                <div 
                  className="border-2 border-dashed border-gray-300 p-4 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: generateHTML() }}
                />
              </div>
            ) : activeTab === 'iframe' ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="mb-6 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">IFrame Embed Code</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={copyCode}
                      disabled={!widgetToken || generatingToken}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      <span>{copied ? 'Copied!' : 'Copy IFrame'}</span>
                    </button>
                    <button
                      onClick={downloadHTML}
                      disabled={!widgetToken || generatingToken}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download size={16} />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
                
                {widgetToken ? (
                  <>
                    <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
                      <pre className="text-green-400 text-sm whitespace-pre-wrap">
                        <code>{generateIFrameCode()}</code>
                      </pre>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2 text-blue-800">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">Widget Token Generated</span>
                      </div>
                      <p className="text-sm text-blue-700 mt-1">
                        This widget will work in any iframe and automatically update with your latest Instagram posts.
                        Token expires in 1 year.
                      </p>
                    </div>
                  </>
                ) : generatingToken ? (
                  <div className="bg-gray-100 rounded-lg p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Generating secure widget token...</p>
                    {debugMode && (
                      <p className="text-xs text-gray-500 mt-2">
                        Check debug panel for detailed progress
                      </p>
                    )}
                  </div>
                ) : tokenError ? (
                  <div className="bg-red-50 rounded-lg p-8 text-center">
                    <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
                    <p className="text-red-600 mb-2">Failed to generate widget token</p>
                    <p className="text-sm text-red-500 mb-4">{tokenError}</p>
                    <button
                      onClick={generateWidgetToken}
                      className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-lg p-8 text-center">
                    <p className="text-gray-600 mb-4">Widget token not generated yet</p>
                    <button
                      onClick={generateWidgetToken}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Generate Widget Token
                    </button>
                  </div>
                )}
                
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2 flex items-center">
                      ✅ IFrame Advantages
                    </h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Automatically updates with new posts</li>
                      <li>• Works in any website or iframe</li>
                      <li>• Secure token-based authentication</li>
                      <li>• No cookies required</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">How to use:</h4>
                    <ol className="text-sm text-blue-800 space-y-1">
                      <li>1. Copy the IFrame code above</li>
                      <li>2. Paste it into your website HTML</li>
                      <li>3. Feed updates automatically!</li>
                      <li>4. Token is valid for 1 year</li>
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