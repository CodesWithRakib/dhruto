import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { PricingService } from "./pricing.service.js";
import {
  pricingCalculationSchema,
  type PricingResult,
  type ApiResponse,
} from "@dhruto/contracts";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";

export class PricingCalculationDto extends createZodDto(pricingCalculationSchema) {}

@ApiTags("Pricing")
@Controller("pricing")
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post("calculate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Calculate dynamic delivery fee",
    description:
      "Calculates delivery fee based on destination district/thana, parcel weight, and COD amount.",
  })
  @ApiOkResponse({
    description: "Pricing calculation returned successfully",
  })
  @ApiUnprocessableEntityResponse({
    description: "Validation error on input fields",
  })
  calculate(
    @Body() dto: PricingCalculationDto,
    @Req() req: RequestWithId,
  ): ApiResponse<PricingResult> {
    const result = this.pricingService.calculate(dto);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Delivery fee calculated successfully",
      data: result,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }
}
