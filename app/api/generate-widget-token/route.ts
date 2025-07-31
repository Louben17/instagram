import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getCurrentUser } from '../../../lib/auth';
import { v4 as uuidv4 } from 'uuid';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const redis = Redis.fromEnv();

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    const body = await request.json();
    const { expiresInDays = 30 } = body; // Default 30 days

    // Generate unique token
    const token = uuidv4().replace(/-/g, ''); // Remove dashes for cleaner token
    
    // Calculate expiration time
    const expiresAt = Date.now() + (expiresInDays * 24 * 60 * 60 * 1000);
    
    // Store token in Redis
    const tokenKey = `widget:token:${token}`;
    const tokenData = {
      userId: user.id,
      createdAt: Date.now(),
      expiresAt,
    };
    
    // Set token with TTL (Time To Live)
    await redis.set(tokenKey, tokenData, {
      ex: expiresInDays * 24 * 60 * 60 // Redis TTL in seconds
    });

    // Store token reference in user's token list
    const userTokensKey = `user:${user.id}:widget-tokens`;
    await redis.sadd(userTokensKey, token);

    return NextResponse.json({
      token,
      expiresAt,
      expiresIn: expiresInDays,
      createdAt: Date.now(),
      widgetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/widget/${token}`,
      user: {
        id: user.id,
        username: user.username,
      }
    });

  } catch (error) {
    console.error('Generate token error:', error);
    return NextResponse.json(
      { error: 'Failed to generate widget token' },
      { status: 500 }
    );
  }
}

// Get user's widget tokens
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // Get all user's tokens
    const userTokensKey = `user:${user.id}:widget-tokens`;
    const tokens = await redis.smembers(userTokensKey);

    // Get token details
    const tokenDetails = await Promise.all(
      tokens.map(async (token) => {
        const tokenKey = `widget:token:${token}`;
        const tokenData = await redis.get<{
          userId: string;
          createdAt: number;
          expiresAt: number;
        }>(tokenKey);

        if (!tokenData) {
          // Clean up invalid token reference
          await redis.srem(userTokensKey, token);
          return null;
        }

        return {
          token,
          ...tokenData,
          isExpired: tokenData.expiresAt < Date.now(),
          widgetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/widget/${token}`,
        };
      })
    );

    // Filter out null values (expired/invalid tokens)
    const validTokens = tokenDetails.filter(Boolean);

    return NextResponse.json({
      tokens: validTokens,
      count: validTokens.length,
    });

  } catch (error) {
    console.error('Get tokens error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch widget tokens' },
      { status: 500 }
    );
  }
}