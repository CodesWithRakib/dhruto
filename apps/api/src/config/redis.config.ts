import { registerAs } from "@nestjs/config";

export interface RedisConfig {
  url: string;
  host: string;
  port: number;
  upstashRestUrl?: string;
  upstashRestToken?: string;
  isProduction: boolean;
  isUpstash: boolean;
  targetSummary: string;
}

/**
 * Resolves the Redis configuration with environment awareness:
 * - In local development / test: Uses local Redis (default: redis://localhost:6379)
 *   to guarantee 0ms latency and prevent exhausting Upstash's free quota limit.
 *   Even if Upstash credentials are present in .env, development will guard against
 *   accidental cloud quota exhaustion unless USE_UPSTASH_IN_DEV="true" is explicitly specified.
 * - In production: Uses the production REDIS_URL or synthesizes the TLS TCP rediss:// URL
 *   from UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
 */
export function buildRedisConfig(env: NodeJS.ProcessEnv = process.env): RedisConfig {
  const isProduction = env.NODE_ENV === "production";
  const useUpstashInDev = env.USE_UPSTASH_IN_DEV === "true";
  const explicitUrl = env.REDIS_URL?.trim();

  const restUrl = env.UPSTASH_REDIS_REST_URL?.trim();
  const restToken = env.UPSTASH_REDIS_REST_TOKEN?.trim();

  // Check if explicit REDIS_URL points to Upstash
  const isExplicitUpstash = explicitUrl ? explicitUrl.includes("upstash.io") : false;

  // Development guard: If running outside production and Upstash is configured,
  // guard against accidental quota drainage unless explicit opt-in.
  if (!isProduction && !useUpstashInDev) {
    if (isExplicitUpstash) {
      // Developer set REDIS_URL to Upstash without explicit opt-in
      const fallbackUrl = "redis://localhost:6379";
      return {
        url: fallbackUrl,
        host: "localhost",
        port: 6379,
        isProduction: false,
        isUpstash: false,
        targetSummary: "Local Redis Engine (localhost:6379) [Dev guard: Upstash bypassed to protect free quota]",
      };
    }

    if (explicitUrl) {
      const safeSummary = explicitUrl.replace(/:[^:@]+@/, ":****@");
      return {
        url: explicitUrl,
        host: env.REDIS_HOST?.trim() || "localhost",
        port: parseInt(env.REDIS_PORT || "6379", 10),
        isProduction: false,
        isUpstash: false,
        targetSummary: safeSummary,
      };
    }

    // Default development: Local Redis
    const host = env.REDIS_HOST?.trim() || "localhost";
    const port = parseInt(env.REDIS_PORT || "6379", 10);
    return {
      url: `redis://${host}:${port}`,
      host,
      port,
      isProduction: false,
      isUpstash: false,
      targetSummary: `Local Redis Engine (${host}:${port})`,
    };
  }

  // Production or explicit dev opt-in (USE_UPSTASH_IN_DEV="true")
  if (explicitUrl) {
    const isUpstash = explicitUrl.includes("upstash.io");
    const safeSummary = explicitUrl.replace(/:[^:@]+@/, ":****@");
    return {
      url: explicitUrl,
      host: env.REDIS_HOST?.trim() || (isUpstash ? "upstash.io" : "localhost"),
      port: parseInt(env.REDIS_PORT || "6379", 10),
      upstashRestUrl: restUrl,
      upstashRestToken: restToken,
      isProduction,
      isUpstash,
      targetSummary: safeSummary,
    };
  }

  // Synthesize from Upstash REST URL and Token if provided
  if (restUrl && restToken) {
    const rawHost = restUrl.replace(/^https?:\/\//i, "").replace(/[/?#].*$/, "");
    const token = encodeURIComponent(restToken);
    const upstashUrl = `rediss://default:${token}@${rawHost}:6379`;
    return {
      url: upstashUrl,
      host: rawHost,
      port: 6379,
      upstashRestUrl: restUrl,
      upstashRestToken: restToken,
      isProduction,
      isUpstash: true,
      targetSummary: `Upstash Cloud Redis (rediss://****@${rawHost}:6379)`,
    };
  }

  // Fallback if production has no Upstash credentials
  const host = env.REDIS_HOST?.trim() || "localhost";
  const port = parseInt(env.REDIS_PORT || "6379", 10);
  return {
    url: `redis://${host}:${port}`,
    host,
    port,
    isProduction,
    isUpstash: false,
    targetSummary: `Redis Engine (${host}:${port})`,
  };
}

export const redisConfig = registerAs<RedisConfig>("redis", () => buildRedisConfig());
