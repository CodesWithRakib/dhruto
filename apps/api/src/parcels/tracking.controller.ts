import { Controller, Get, HttpCode, HttpStatus, Param, Req, UseGuards } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from "@nestjs/swagger";
import { ParcelsService } from "./parcels.service.js";
import { PublicTrackingResponseDto } from "./dto/parcel-details-response.dto.js";
import { Public } from "../auth/decorators/public.decorator.js";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard.js";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";

/**
 * Public, unauthenticated parcel tracking.
 *
 * Exposes only public-safe fields (docs/10-SECURITY.md §6): no merchant
 * identity, no money, no internal user ids. Rate limited and cached briefly.
 */
@ApiTags("Tracking")
@Public()
@UseGuards(RateLimitGuard)
@Controller("tracking")
export class TrackingController {
  constructor(private readonly parcelsService: ParcelsService) {}

  @Get(":trackingCode")
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "tracking" })
  @ApiOperation({
    summary: "Public parcel tracking",
    description:
      "Returns public-safe tracking status and a bilingual (EN/BN) timeline for a tracking code. No authentication required.",
  })
  @ApiOkResponse({
    description: "Tracking information",
    type: PublicTrackingResponseDto,
  })
  @ApiNotFoundResponse({ description: "Tracking code not found" })
  @ApiTooManyRequestsResponse({ description: "Rate limit exceeded" })
  async getTracking(@Param("trackingCode") trackingCode: string, @Req() req: RequestWithId) {
    const data = await this.parcelsService.getTracking(trackingCode);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Tracking information retrieved successfully",
      data,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }
}
