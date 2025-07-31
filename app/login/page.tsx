'use client';

import { useState } from 'react';
import { Instagram, Loader2, Zap } from 'lucide-react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    window.location.href = '/api/auth/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Instagram Feed
          </h1>
          <p className="text-gray-600">
            Připojte svůj Instagram účet a získejte přístup k vašemu feedu
          </p>
        </div>

        {/* Features */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Bezpečné OAuth připojení</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Rychlý přístup k vašim příspěvkům</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">JSON feed pro vaše aplikace</span>
          </div>
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center justify-center space-x-3 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              <span>Připojuji...</span>
            </>
          ) : (
            <>
              <Instagram size={24} />
              <span>Připojit Instagram</span>
            </>
          )}
        </button>

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Budete přesměrováni na Instagram pro autorizaci.
            <br />
            Vaše přihlašovací údaje zůstávají v bezpečí.
          </p>
        </div>
      </div>
    </div>
  );
}