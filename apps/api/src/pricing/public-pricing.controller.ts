import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import type { PricingResult } from "@dhruto/contracts";
import { Public } from "../auth/decorators/public.decorator.js";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard.js";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";
import { PricingService } from "./pricing.service.js";
import { PricingCalculationDto, PricingResultDto } from "./pricing.controller.js";

/**
 * Anonymous delivery quotes for the marketing pricing calculator.
 *
 * Kept as a separate controller (not a @Public handler on PricingController)
 * because the class-level @Roles there would still reject anonymous callers.
 * The quote is a pure in-memory computation over published rate cards — no
 * database, merchant or customer data is touched — so exposing it is safe.
 * A stricter per-IP limit than the authenticated endpoint bounds abuse.
 */
@ApiTags("Pricing")
@Public()
@UseGuards(RateLimitGuard)
@Controller("pricing")
export class PublicPricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post("quote")
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "pricing-public-quote" })
  @ApiOperation({
    summary: "Public delivery-fee quote",
    description:
      "Unauthenticated quote used by the public pricing calculator. Same formula as POST /pricing/calculate.",
  })
  @ApiOkResponse({ description: "Pricing breakdown", type: PricingResultDto })
  @ApiUnprocessableEntityResponse({ description: "Validation failed" })
  @ApiTooManyRequestsResponse({ description: "Rate limit exceeded" })
  quote(@Body() dto: PricingCalculationDto, @Req() req: RequestWithId) {
    const data: PricingResult = this.pricingService.calculate(dto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Delivery fee quoted successfully",
      data,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }
}
