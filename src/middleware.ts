import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROUTES } from '@/constants/routes';

const PUBLIC_ROUTES: string[] = [ROUTES.LOGIN];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static dosyalar, API auth ve Login sayfasına doğrudan izin ver
  if (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
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
    return NextResponse.redirect(new URL(ROUTES.LOGIN, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
