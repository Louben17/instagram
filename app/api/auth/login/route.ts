import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const returnUrl = searchParams.get('return_url') || '/dashboard';
    
    // Rate limiting check
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    
    // Facebook OAuth URL for Instagram Business Login
    const facebookAuthUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    
    facebookAuthUrl.searchParams.set('client_id', process.env.INSTAGRAM_CLIENT_ID!);
    facebookAuthUrl.searchParams.set('redirect_uri', 
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
    );
    facebookAuthUrl.searchParams.set('scope', 'instagram_basic,pages_show_list');
    facebookAuthUrl.searchParams.set('response_type', 'code');
    
    // State parameter for security (include return URL)
    const state = Buffer.from(JSON.stringify({ 
      returnUrl,
      timestamp: Date.now(),
      ip: clientIP 
    })).toString('base64');
    
    facebookAuthUrl.searchParams.set('state', state);

    return NextResponse.redirect(facebookAuthUrl.toString());
    
  } catch (error) {
    console.error('Auth login error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authentication' }, 
      { status: 500 }
    );
  }
}