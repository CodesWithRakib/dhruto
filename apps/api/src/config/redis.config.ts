import { registerAs } from "@nestjs/config";

export interface RedisConfig {
  url?: string;
  host: string;
  port: number;
}

export const redisConfig = registerAs<RedisConfig>("redis", () => ({
  url: process.env.REDIS_URL,
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
}));
