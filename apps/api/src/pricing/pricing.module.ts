import { Module } from "@nestjs/common";
import { PricingService } from "./pricing.service.js";
import { PricingController } from "./pricing.controller.js";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard.js";

@Module({
  controllers: [PricingController],
  providers: [PricingService, RateLimitGuard],
  exports: [PricingService],
})
export class PricingModule {}
