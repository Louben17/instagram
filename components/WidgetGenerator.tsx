'use client';

import { useState } from 'react';
import { Copy, Settings, Eye, Code } from 'lucide-react';

interface WidgetConfig {
  layout: 'grid' | 'slider' | 'masonry';
  columns: number;
  spacing: number;
  showCaptions: boolean;
  borderRadius: number;
}

export default function WidgetGenerator() {
  const [instagramUrl, setInstagramUrl] = useState('');
  const [widgetId, setWidgetId] = useState('');
  const [config, setConfig] = useState<WidgetConfig>({
    layout: 'grid',
    columns: 3,
    spacing: 10,
    showCaptions: true,
    borderRadius: 8
  });
  const [isLoading, setIsLoading] = useState(false);
  const [embedCode, setEmbedCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const generateWidget = async () => {
    if (!instagramUrl) return;
    
    setIsLoading(true);
    setMessage('');
    setError('');
    
    try {
      console.log('Generating widget for:', instagramUrl);
      
      const response = await fetch('/api/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: instagramUrl,
          config: config 
        })
      });
      
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success) {
        setWidgetId(data.widgetId);
        
        // Generování embed kódu s auto-resize
        const embedUrl = `${window.location.origin}/embed/${data.widgetId}`;
        const iframe = `<iframe src="${embedUrl}" width="100%" height="200" frameborder="0" style="border: none; border-radius: ${config.borderRadius}px;" onload="this.style.height=this.contentWindow.document.body.scrollHeight + 'px'"></iframe>

<script>
// Auto-resize iframe listener
window.addEventListener('message', function(e) {
  if (e.data.type === 'resize-iframe') {
    const iframe = document.querySelector('iframe[src*="${data.widgetId}"]');
    if (iframe) {
      iframe.style.height = e.data.height + 'px';
    }
  }
});
</script>`;
        setEmbedCode(iframe);
        
        // Zobrazit zprávu uživateli
        setMessage(data.message || 'Widget úspěšně vytvořen!');
      } else {
        console.error('Widget creation failed:', data.error);
        setError(data.error || 'Nastala chyba při vytváření widgetu');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Nastala chyba při komunikaci se serverem');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Instagram Widget Generator
        </h1>
        <p className="text-gray-600 text-lg">
          Vytvořte krásný Instagram feed pro váš Shoptet e-shop
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-xl p-6 shadow-lg border">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Instagram URL nebo Username
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://www.instagram.com/p/ABC123/ nebo @username"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={generateWidget}
            disabled={!instagramUrl || isLoading}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Generuji...' : 'Vytvořit Widget'}
          </button>
        </div>
        
        {/* Status Messages */}
        {message && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm">✅ {message}</p>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">❌ {error}</p>
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-xl p-6 shadow-lg border">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Konfigurace
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Layout
            </label>
            <select
              value={config.layout}
              onChange={(e) => setConfig({...config, layout: e.target.value as any})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="grid">Grid</option>
              <option value="slider">Slider</option>
              <option value="masonry">Masonry</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sloupce
            </label>
            <input
              type="number"
              min="1"
              max="6"
              value={config.columns}
              onChange={(e) => setConfig({...config, columns: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mezery (px)
            </label>
            <input
              type="number"
              min="0"
              max="50"
              value={config.spacing}
              onChange={(e) => setConfig({...config, spacing: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zaoblení (px)
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={config.borderRadius}
              onChange={(e) => setConfig({...config, borderRadius: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.showCaptions}
              onChange={(e) => setConfig({...config, showCaptions: e.target.checked})}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm font-medium text-gray-700">Zobrazit popisky</span>
          </label>
        </div>
      </div>

      {/* Preview */}
      {widgetId && (
        <div className="bg-white rounded-xl p-6 shadow-lg border">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Náhled
          </h3>
          <div className="border rounded-lg p-4 bg-gray-50">
            <iframe
              src={`/embed/${widgetId}`}
              width="100%"
              height="400"
              className="border-0 rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Embed Code */}
      {embedCode && (
        <div className="bg-white rounded-xl p-6 shadow-lg border">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Code className="w-5 h-5" />
            Kód pro Shoptet
          </h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Zkopírujte tento kód a vložte do HTML widgetu v Shoptetu:
              </p>
              <div className="relative">
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{embedCode}
                </pre>
                <button
                  onClick={() => copyToClipboard(embedCode)}
                  className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                >
                  <Copy className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Jak vložit do Shoptetu:</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Přihlaste se do Shoptet administrace</li>
                <li>2. Jděte na Design → Widgets</li>
                <li>3. Vytvořte nový HTML widget</li>
                <li>4. Vložte zkopírovaný kód</li>
                <li>5. Uložte a umístěte widget na stránku</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}