// User types for OAuth system
export interface User {
  id: string;
  instagramUserId: string;
  username: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt: number;
  profilePictureUrl?: string;
  followersCount?: number;
  mediaCount?: number;
  createdAt: number;
  lastLoginAt: number;
  isActive: boolean;
}

export interface UserSession {
  userId: string;
  sessionId: string;
  expiresAt: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface InstagramTokenResponse {
  access_token: string;
  user_id: number;
  expires_in?: number;
}

export interface InstagramUserInfo {
  id: string;
  username: string;
  account_type: string;
  media_count: number;
}

export interface InstagramMedia {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  caption?: string;
  timestamp: string;
  username: string;
}

// Redis keys helper
export const RedisKeys = {
  user: (id: string) => `user:${id}`,
  userByInstagramId: (instagramId: string) => `user:instagram:${instagramId}`,
  session: (sessionId: string) => `session:${sessionId}`,
  userSessions: (userId: string) => `user:${userId}:sessions`,
  userMedia: (userId: string) => `user:${userId}:media`,
  rateLimitAuth: (ip: string) => `ratelimit:auth:${ip}`,
  rateLimitApi: (userId: string) => `ratelimit:api:${userId}`,
} as const;