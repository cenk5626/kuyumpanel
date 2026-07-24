import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { ROUTES } from '@/constants/routes';

const PUBLIC_ROUTES = [ROUTES.LOGIN];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isPublicRoute = PUBLIC_ROUTES.includes(nextUrl.pathname as any);
  const isApiAuth = nextUrl.pathname.startsWith(ROUTES.API_AUTH);

  // Allow auth API routes
  if (isApiAuth) {
    return NextResponse.next();
  }

  // Redirect logged-in users away from login
  if (isPublicRoute && isLoggedIn) {
    return NextResponse.redirect(new URL(ROUTES.DASHBOARD, nextUrl));
  }

  // Redirect non-logged-in users to login
  if (!isPublicRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL(ROUTES.LOGIN, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
