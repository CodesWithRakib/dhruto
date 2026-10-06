import { SetMetadata } from "@nestjs/common";

export const RATE_LIMIT_KEY = "rate_limit";

export interface RateLimitOptions {
  /** Maximum number of requests allowed inside the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
  /** Namespace so different endpoints keep independent counters. */
  scope: string;
}

/**
 * Applies a fixed-window rate limit to a route handler.
 *
 * Implemented on top of the existing CacheService (Redis, with the in-memory
 * fallback), so no new infrastructure is introduced.
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
