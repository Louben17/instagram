// Instagram Token Management
interface TokenInfo {
  access_token: string;
  expires_in: number;
  token_type: string;
}

// Globální storage pro token info (v produkci použijte databázi)
const globalForToken = globalThis as unknown as { 
  tokenInfo: TokenInfo | null;
  lastRefresh: number;
};

export class InstagramTokenManager {
  private static instance: InstagramTokenManager;
  
  public static getInstance(): InstagramTokenManager {
    if (!InstagramTokenManager.instance) {
      InstagramTokenManager.instance = new InstagramTokenManager();
    }
    return InstagramTokenManager.instance;
  }

  // Získání platného tokenu
  async getValidToken(): Promise<string> {
    const currentToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    
    if (!currentToken) {
      console.log('No token in environment - running in development mode');
      throw new Error('Instagram token not configured - add INSTAGRAM_ACCESS_TOKEN to Vercel environment variables');
    }

    // Zkontroluj, jestli token potřebuje refresh
    if (await this.shouldRefreshToken()) {
      console.log('Token needs refresh, attempting to refresh...');
      try {
        const newToken = await this.refreshToken(currentToken);
        return newToken;
      } catch (error) {
        console.error('Token refresh failed:', error);
        console.log('Using existing token as fallback');
        return currentToken;
      }
    }

    return currentToken;
  }

  // Kontrola, jestli token potřebuje refresh
  private async shouldRefreshToken(): Promise<boolean> {
    const lastCheck = globalForToken.lastRefresh || 0;
    const now = Date.now();
    
    // Kontroluj max 1x za den
    if (now - lastCheck < 24 * 60 * 60 * 1000) {
      return false;
    }

    globalForToken.lastRefresh = now;

    try {
      // Test aktuálního tokenu
      const testResponse = await fetch(
        `https://graph.instagram.com/me?fields=id&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`,
        { method: 'GET' }
      );

      if (testResponse.ok) {
        console.log('Current token is still valid');
        return false;
      } else {
        console.log('Current token failed test, needs refresh');
        return true;
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      return true;
    }
  }

  // Refresh tokenu
  private async refreshToken(currentToken: string): Promise<string> {
    console.log('Attempting to refresh Instagram token...');
    
    try {
      const response = await fetch(
        `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`,
        { method: 'GET' }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Token refreshed successfully');
        
        // V produkci byste zde uložili nový token do databáze
        // a aktualizovali environment variables
        console.log('New token expires in:', data.expires_in, 'seconds');
        
        return data.access_token;
      } else {
        const errorData = await response.text();
        console.error('Token refresh failed:', errorData);
        throw new Error(`Token refresh failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  // Získání info o tokenu
  async getTokenInfo(token: string): Promise<any> {
    try {
      const response = await fetch(
        `https://graph.instagram.com/me?fields=id,username,media_count&access_token=${token}`,
        { method: 'GET' }
      );

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Token info failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Get token info error:', error);
      throw error;
    }
  }
}