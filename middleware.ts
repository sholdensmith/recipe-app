import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, isAuthEnabled, isValidAuthCookie } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // The login page and login endpoint must stay reachable
  if (pathname === '/login' || pathname === '/api/auth') {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (await isValidAuthCookie(cookie)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Everything except Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
