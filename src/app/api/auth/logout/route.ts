import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const COOKIES_TO_CLEAR = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'authjs.csrf-token',
  '__Host-authjs.csrf-token',
  'authjs.callback-url',
  '__Secure-authjs.callback-url',
];

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Oturum başarıyla kapatıldı.' });

  for (const cookieName of COOKIES_TO_CLEAR) {
    response.cookies.set(cookieName, '', {
      path: '/',
      expires: new Date(0),
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  // Set no-cache headers so client never caches the logout response
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');

  return response;
}
