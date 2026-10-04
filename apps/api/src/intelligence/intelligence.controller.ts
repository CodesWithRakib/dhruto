import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { IntelligenceService } from "./intelligence.service.js";
import {
  AddressParseDto,
  RecipientRiskEvaluateDto,
} from "./dto/intelligence.dto.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";

@ApiTags("Intelligence")
@ApiBearerAuth("JWT-auth")
@Controller("intelligence")
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Post("parse-address")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Parse and normalize Bangladesh address into district, thana, zone, and confidence score",
  })
  async parseAddress(
    @Body() dto: AddressParseDto,
    @Req() req?: RequestWithId,
  ) {
    const result = this.intelligenceService.parseAddress(dto);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Address parsed and normalized successfully",
      data: result,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("evaluate-risk")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Evaluate recipient delivery history and calculate RTO risk score",
  })
  async evaluateRisk(
    @Body() dto: RecipientRiskEvaluateDto,
    @Req() req?: RequestWithId,
  ) {
    const result = await this.intelligenceService.evaluateRisk(dto);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Recipient risk evaluation completed successfully",
      data: result,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("analyze-booking")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Complete intelligence analysis: address normalization and recipient risk profile",
  })
  async analyzeBooking(
    @Body() dto: RecipientRiskEvaluateDto,
    @Req() req?: RequestWithId,
  ) {
    const result = await this.intelligenceService.analyzeBooking(dto);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Booking intelligence analysis completed",
      data: result,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }
}
