import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROUTES } from '@/constants/routes';

const PUBLIC_ROUTES: string[] = [
  ROUTES.LOGIN,
  '/login',
  '/showcase',
  '/price-check',
  '/manifest.webmanifest',
  '/manifest.json',
  '/sw.js',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static dosyalar, API auth ve Public sayfalara doğrudan izin ver
  if (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/icons/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // NextAuth JWT session çerezini kontrol et
  const token =
    req.cookies.get('authjs.session-token')?.value ||
    req.cookies.get('__Secure-authjs.session-token')?.value ||
    req.cookies.get('next-auth.session-token')?.value ||
    req.cookies.get('__Secure-next-auth.session-token')?.value;

  // Giriş yapılmamışsa login sayfasına yönlendir
  if (!token) {
    const loginUrl = new URL(ROUTES.LOGIN, req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
