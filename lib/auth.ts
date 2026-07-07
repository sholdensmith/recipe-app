/**
 * Shared-password auth for family use.
 *
 * When SITE_PASSWORD is set, every page and API route requires a cookie
 * holding a SHA-256 digest of the password (see middleware.ts). When it's
 * unset (e.g. local development), auth is disabled entirely.
 *
 * Uses Web Crypto so it runs in both the Edge runtime (middleware) and Node.
 */

export const AUTH_COOKIE = 'recipe_auth';
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export async function passwordDigest(password: string): Promise<string> {
  const data = new TextEncoder().encode(`recipe-app:${password}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function isAuthEnabled(): boolean {
  return !!process.env.SITE_PASSWORD;
}

export async function isValidAuthCookie(cookieValue: string | undefined): Promise<boolean> {
  const password = process.env.SITE_PASSWORD;
  if (!password) return true;
  if (!cookieValue) return false;
  return cookieValue === (await passwordDigest(password));
}
