import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '' })
  : null;

const limiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(10, '60 s'),
      analytics: true,
    })
  : null;

export async function rateLimit(identifier: string) {
  if (!limiter) return { success: true };
  return limiter.limit(identifier);
}
