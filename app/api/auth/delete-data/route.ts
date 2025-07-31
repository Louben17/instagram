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

    // Find and delete all user data
    const user = await redis.get<User>(RedisKeys.userByInstagramId(user_id));
    
    if (user) {
      // Delete all user-related data
      await Promise.all([
        // Delete user record
        redis.del(RedisKeys.user(user.id)),
        redis.del(RedisKeys.userByInstagramId(user_id)),
        // Delete user sessions
        redis.del(RedisKeys.userSessions(user.id)),
        // Delete cached media
        redis.del(`${RedisKeys.userMedia(user.id)}:*`),
        // Delete rate limit data
        redis.del(RedisKeys.rateLimitApi(user.id))
      ]);
      
      console.log(`All data for user ${user_id} deleted`);
    }
    
    return NextResponse.json({ 
      url: `${process.env.NEXT_PUBLIC_APP_URL}/data-deleted`,
      confirmation_code: `DEL_${user_id}_${Date.now()}`
    });
  } catch (error) {
    console.error('Delete data error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}