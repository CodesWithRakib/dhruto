import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { PricingService } from "./pricing.service.js";
import {
  DeliveryZone,
  type PricingCalculation,
  type PricingResult,
} from "@dhruto/contracts";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { UserRole } from "../database/entities/User.entity.js";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard.js";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";

export class PricingCalculationDto implements PricingCalculation {
  @ApiProperty({ example: "Dhaka", description: "Destination district" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "District must be a string" })
  @IsNotEmpty({ message: "District is required" })
  @MinLength(1, { message: "District is required" })
  @MaxLength(50, { message: "District cannot exceed 50 characters" })
  district: string;

  @ApiPropertyOptional({ example: "Dhanmondi", description: "Destination thana" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(50)
  thana?: string;

  @ApiProperty({ example: 1.5, description: "Weight in kilograms" })
  @Type(() => Number)
  @IsNumber({}, { message: "Weight must be a number" })
  @IsPositive({ message: "Weight must be greater than 0" })
  @Max(50, { message: "Weight exceeds maximum allowable limit of 50 kg" })
  weight: number;

  @ApiPropertyOptional({ example: 1200, default: 0, description: "Cash on delivery amount" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "COD amount must be a number" })
  @Min(0, { message: "COD amount cannot be negative" })
  @Max(500000, { message: "COD amount exceeds maximum limit of 500,000 BDT" })
  codAmount: number = 0;
}

export class PricingResultDto implements PricingResult {
  @ApiProperty({ enum: DeliveryZone })
  zone: DeliveryZone;

  @ApiProperty({ example: 60 })
  baseFee: number;

  @ApiProperty({ example: 0 })
  weightFee: number;

  @ApiProperty({ example: 0 })
  additionalCharge: number;

  @ApiProperty({ example: 0 })
  discount: number;

  @ApiProperty({ example: 12 })
  codFee: number;

  @ApiProperty({ example: 72 })
  totalFee: number;

  @ApiProperty({ example: "24-48 hours" })
  estimatedDays: string;
}

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
