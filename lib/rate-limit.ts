import type { NextRequest } from 'next/server';

/**
 * Small in-memory sliding-window rate limiter, keyed by client IP.
 *
 * Good enough to stop someone burning API credits through the AI endpoints.
 * Note: state is per server instance, so on serverless deploys with many
 * concurrent instances the effective limit is higher — acceptable for a
 * family app; swap for a shared store (e.g. Upstash) if that ever matters.
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Max requests allowed within the window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
}

export function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}

export function checkRateLimit(
  request: NextRequest,
  scope: string,
  options: RateLimitOptions
): RateLimitResult {
  const key = `${scope}:${clientKey(request)}`;
  const now = Date.now();
  const cutoff = now - options.windowMs;

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= options.max) {
    return { ok: false, remaining: 0 };
  }

  bucket.timestamps.push(now);

  // Opportunistic cleanup so the map doesn't grow unbounded
  if (buckets.size > 1000) {
    for (const [k, b] of buckets) {
      if (b.timestamps.every((t) => t <= cutoff)) buckets.delete(k);
    }
  }

  return { ok: true, remaining: options.max - bucket.timestamps.length };
}

/** Shared limit for endpoints that call the Anthropic API. */
export const AI_RATE_LIMIT: RateLimitOptions = { max: 20, windowMs: 10 * 60 * 1000 };
