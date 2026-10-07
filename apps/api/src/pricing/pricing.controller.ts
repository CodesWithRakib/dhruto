import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { PricingService } from "./pricing.service.js";
import {
  pricingCalculationSchema,
  pricingResultSchema,
  type PricingResult,
} from "@dhruto/contracts";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { UserRole } from "../database/entities/User.entity.js";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard.js";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";

export class PricingCalculationDto extends createZodDto(pricingCalculationSchema) {}
export class PricingResultDto extends createZodDto(pricingResultSchema) {}

/**
 * Pricing is authoritative on the backend: the merchant UI calls this endpoint
 * for a preview and never computes a fee itself.
 */
@ApiTags("Pricing")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Roles(UserRole.MERCHANT, UserRole.ADMIN)
@Controller("pricing")
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post("calculate")
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 120, windowSeconds: 60, scope: "pricing-calculate" })
  @ApiOperation({
    summary: "Calculate a delivery-fee breakdown",
    description:
      "Calculates the authoritative delivery fee from destination zone, parcel weight and COD amount. Financial amounts are computed with fixed-precision integer arithmetic.",
  })
  @ApiOkResponse({
    description: "Pricing breakdown",
    type: PricingResultDto,
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiForbiddenResponse({ description: "Caller is not a merchant or admin" })
  @ApiUnprocessableEntityResponse({ description: "Validation failed" })
  @ApiTooManyRequestsResponse({ description: "Rate limit exceeded" })
  calculate(@Body() dto: PricingCalculationDto, @Req() req: RequestWithId) {
    const data: PricingResult = this.pricingService.calculate(dto);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Delivery fee calculated successfully",
      data,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }
}
