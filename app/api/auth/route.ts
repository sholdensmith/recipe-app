import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, AUTH_COOKIE_MAX_AGE, isAuthEnabled, passwordDigest } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    if (!isAuthEnabled()) {
      return NextResponse.json({ error: 'Auth is not enabled' }, { status: 400 });
    }

    // Slow down password guessing
    const limit = checkRateLimit(request, 'auth', { max: 10, windowMs: 10 * 60 * 1000 });
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again in a few minutes.' },
        { status: 429 }
      );
    }

    const { password } = await request.json();

    if (typeof password !== 'string' || password !== process.env.SITE_PASSWORD) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_COOKIE, await passwordDigest(password), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: AUTH_COOKIE_MAX_AGE,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
