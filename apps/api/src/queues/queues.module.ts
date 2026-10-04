import { Module, Logger } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { type RedisConfig } from "../config/redis.config.js";

const logger = new Logger("QueuesModule");

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redis = configService.get<RedisConfig>("redis");
        const connectionOptions = redis?.url
          ? {
              url: redis.url,
              maxRetriesPerRequest: null,
              enableOfflineQueue: false,
              lazyConnect: true,
            }
          : {
              host: redis?.host || "localhost",
              port: redis?.port || 6379,
              maxRetriesPerRequest: null,
              enableOfflineQueue: false,
              lazyConnect: true,
            };

        logger.log(
          `Configured BullMQ queue infrastructure with Redis host: ${redis?.host || "localhost"}:${redis?.port || 6379}`,
        );

        return {
          connection: connectionOptions,
        };
      },
    }),
    BullModule.registerQueue({
      name: "notifications",
    }),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
