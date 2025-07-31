export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-6">
            Účinnost: {new Date().toLocaleDateString('cs-CZ')}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Úvod</h2>
            <p className="text-gray-700 mb-4">
              Tato aplikace slouží k zobrazení vašeho Instagram feedu prostřednictvím oficiálního Instagram API. 
              Respektujeme vaše soukromí a zavazujeme se chránit vaše osobní údaje.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Jaké údaje sbíráme</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Instagram uživatelské ID a uživatelské jméno</li>
              <li>Přístupový token pro Instagram API</li>
              <li>Veřejná data z vašeho Instagram feedu</li>
              <li>Základní informace o relaci (IP adresa, user agent)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Jak údaje používáme</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>K zobrazení vašeho Instagram feedu v aplikaci</li>
              <li>K uchování přihlášení mezi relacemi</li>
              <li>K poskytování JSON feed API</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Sdílení údajů</h2>
            <p className="text-gray-700">
              Vaše údaje nesdílíme s třetími stranami. Všechna data jsou uložena bezpečně 
              v naší databázi a používána pouze pro funkčnost aplikace.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Uložení údajů</h2>
            <p className="text-gray-700">
              Údaje jsou uloženy po dobu platnosti vašeho přístupového tokenu. 
              Můžete kdykoli odvolat přístup prostřednictvím nastavení Instagramu.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Vaše práva</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Právo na přístup k vašim údajům</li>
              <li>Právo na opravu nesprávných údajů</li>
              <li>Právo na smazání vašich údajů</li>
              <li>Právo odvolat souhlas kdykoli</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Kontakt</h2>
            <p className="text-gray-700">
              Pokud máte jakékoli otázky ohledně této zásady ochrany osobních údajů, 
              kontaktujte nás prostřednictvím nastavení aplikace.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Změny zásad</h2>
            <p className="text-gray-700">
              Vyhrazujeme si právo aktualizovat tyto zásady. O významných změnách 
              budeme uživatele informovat prostřednictvím aplikace.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}