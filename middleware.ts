import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// ============================================================================
// DEVELOPMENT ONLY: Authentication Bypass Flag
// Set to false to re-enable full production authentication and redirects.
// ============================================================================
export const DEV_AUTH_BYPASS = true;

const JWT_SECRET = process.env.JWT_SECRET || 'continuity-transition-readiness-audit-jwt-secret-key-987654321';
const key = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Root path always redirects to /dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Exclude static assets, icons, manifest files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') || 
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // DEVELOPMENT ONLY: If auth bypass is enabled, skip all auth redirects
  if (DEV_AUTH_BYPASS) {
    return NextResponse.next();
  }

  // --- Production Authentication & Redirect Logic (Kept for re-enabling) ---
  const isPublicPath = pathname === '/login' || pathname.startsWith('/api/auth/login');
  const token = request.cookies.get('cts_session')?.value;

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, key);
      isAuthenticated = true;
    } catch (e) {
      // Token is invalid/expired
    }
  }

  // Redirect logic
  if (isPublicPath && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!isPublicPath && !isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files and standard web assets.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
