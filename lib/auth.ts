import { Redis } from '@upstash/redis';
import { cookies } from 'next/headers';
import { User, UserSession, RedisKeys } from '../types/user';

const redis = Redis.fromEnv();

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return null;
    }

    // Get session from Redis
    const session = await redis.get<UserSession>(RedisKeys.session(sessionId));
    
    if (!session || session.expiresAt < Date.now()) {
      // Clean up expired session
      if (session) {
        await redis.del(RedisKeys.session(sessionId));
      }
      return null;
    }

    // Get user data
    const user = await redis.get<User>(RedisKeys.user(session.userId));
    
    if (!user || !user.isActive) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

export async function logout(): Promise<void> {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (sessionId) {
      // Remove session from Redis
      await redis.del(RedisKeys.session(sessionId));
      
      // Clear cookie
      cookieStore.delete('session');
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
}

export async function refreshInstagramToken(user: User): Promise<User | null> {
  try {
    // Check if token is about to expire (refresh 1 hour before expiry)
    const oneHourFromNow = Date.now() + 60 * 60 * 1000;
    
    if (user.tokenExpiresAt > oneHourFromNow) {
      return user; // Token is still valid
    }

    // Instagram Basic Display doesn't support token refresh
    // User needs to re-authenticate
    return null;
    
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

export async function isValidInstagramToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.instagram.com/me?access_token=${accessToken}`
    );
    
    return response.ok;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}