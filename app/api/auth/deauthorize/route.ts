import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { RedisKeys, User } from '../../../../types/user';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const redis = Redis.fromEnv();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    // Find user by Instagram ID and deactivate
    const user = await redis.get<User>(RedisKeys.userByInstagramId(user_id));
    
    if (user) {
      // Mark user as inactive
      const updatedUser = { ...user, isActive: false, accessToken: '' };
      
      await Promise.all([
        redis.set(RedisKeys.user(user.id), updatedUser),
        redis.set(RedisKeys.userByInstagramId(user_id), updatedUser),
        // Clear user's cached media
        redis.del(`${RedisKeys.userMedia(user.id)}:*`)
      ]);
    }

    console.log(`User ${user_id} deauthorized`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Deauthorize error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}