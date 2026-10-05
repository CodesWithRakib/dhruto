import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CacheService } from "./cache.service.js";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
