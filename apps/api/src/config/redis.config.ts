import { registerAs } from "@nestjs/config";

export interface RedisConfig {
  url?: string;
  host: string;
  port: number;
  upstashRestUrl?: string;
  upstashRestToken?: string;
}

function resolveRedisUrl(): string | undefined {
  const explicitUrl = process.env.REDIS_URL;
  if (explicitUrl && explicitUrl.trim()) {
    return explicitUrl.trim();
  }

  // If Upstash credentials are provided, construct the standard TLS TCP rediss:// URL
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (restUrl && restToken) {
    const rawHost = restUrl.replace(/^https?:\/\//i, "").replace(/[/?#].*$/, "");
    const token = encodeURIComponent(restToken);
    return `rediss://default:${token}@${rawHost}:6379`;
  }

  return undefined;
}

export const redisConfig = registerAs<RedisConfig>("redis", () => {
  const url = resolveRedisUrl();
  return {
    url,
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    upstashRestUrl: process.env.UPSTASH_REDIS_REST_URL,
    upstashRestToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
});

