import WidgetGenerator from '../components/WidgetGenerator';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
      <div className="container mx-auto py-12">
        <WidgetGenerator />
      </div>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Instagram Widget Generator</h3>
              <p className="text-gray-600 text-sm">
                Vytvářejte krásné Instagram feedy pro vaše Shoptet e-shopy jednoduše a rychle.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 mb-3">Funkce</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Responsive design</li>
                <li>• Různé layouty (Grid, Slider, Masonry)</li>
                <li>• Snadná integrace do Shoptetu</li>
                <li>• Bez API klíčů</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 mb-3">Jak na to</h4>
              <ol className="space-y-2 text-sm text-gray-600">
                <li>1. Zadejte Instagram URL</li>
                <li>2. Nastavte vzhled</li>
                <li>3. Zkopírujte kód</li>
                <li>4. Vložte do Shoptetu</li>
              </ol>
            </div>
          </div>
          
          <div className="border-t border-gray-200 mt-8 pt-8 text-center">
            <p className="text-gray-500 text-sm">
              © 2025 Instagram Widget Generator. Vytvořeno s ❤️ pro Shoptet e-shopy.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}