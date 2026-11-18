import { Module } from "@nestjs/common";
import { PricingService } from "./pricing.service.js";
import { PricingController } from "./pricing.controller.js";
import { PublicPricingController } from "./public-pricing.controller.js";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard.js";

@Module({
  controllers: [PricingController, PublicPricingController],
  providers: [PricingService, RateLimitGuard],
  exports: [PricingService],
})
export class PricingModule {}
