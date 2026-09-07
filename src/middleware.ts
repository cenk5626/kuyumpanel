import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROUTES } from '@/constants/routes';

// Herkese açık (kimlik doğrulama gerektirmeyen) sayfalar
const PUBLIC_ROUTES: string[] = [
  ROUTES.LOGIN,
  '/login',
  '/showcase',
  '/price-check',
  '/manifest.webmanifest',
  '/manifest.json',
  '/sw.js',
];

// Herkese açık API uç noktaları (Showcase TV modu, barkod kiosk ve kimlik doğrulama)
const PUBLIC_API_PREFIXES: string[] = [
  '/api/auth/',
  '/api/prices/live',
  '/api/prices/altis',
  '/api/prices/has',
  '/api/prices/ziynet',
];

/**
 * Yanıta güvenlik ve gizlilik HTTP başlıklarını enjekte eder.
 */
function applySecurityHeaders(res: NextResponse, isApi: boolean = false): NextResponse {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(self), serial=(self), microphone=()');
  
  // CSP (Content Security Policy)
  res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: wss:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';"
  );

  // Hassas API yanıtlarının tarayıcı veya proxy önbelleğine yazılmasını engelle
  if (isApi) {
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.headers.set('Pragma', 'no-cache');
  }

  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // Statik dosyalar ve dahili Next.js kaynaklarına doğrudan izin ver
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 1. CSRF & Origin Doğrulaması: Veri değiştiren isteklerde Origin kontrolü
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const origin = req.headers.get('origin');
    if (origin) {
      const allowedOrigin = req.nextUrl.origin;
      if (origin !== allowedOrigin) {
        return applySecurityHeaders(
          NextResponse.json({ error: 'CSRF Cross-Origin Request Blocked' }, { status: 403 }),
          true
        );
      }
    }
  }

  // 2. NextAuth JWT Session Çerezini Kontrol Et
  const token =
    req.cookies.get('authjs.session-token')?.value ||
    req.cookies.get('__Secure-authjs.session-token')?.value ||
    req.cookies.get('next-auth.session-token')?.value ||
    req.cookies.get('__Secure-next-auth.session-token')?.value;

  // 3. API Uç Noktaları Koruması
  if (pathname.startsWith('/api/')) {
    const isPublicApi = PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    if (!isPublicApi && !token) {
      return applySecurityHeaders(
        NextResponse.json({ error: 'Unauthorized: Lütfen giriş yapınız.' }, { status: 401 }),
        true
      );
    }

    return applySecurityHeaders(NextResponse.next(), true);
  }

  // 4. Sayfa Yönlendirmeleri (UI Pages)
  if (PUBLIC_ROUTES.includes(pathname)) {
    return applySecurityHeaders(NextResponse.next());
  }

  // Oturum açılmamışsa login sayfasına yönlendir
  if (!token) {
    const loginUrl = new URL(ROUTES.LOGIN, req.nextUrl.origin);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
