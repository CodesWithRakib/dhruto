import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
} from "@nestjs/swagger";
import { ParcelsService } from "./parcels.service.js";
import { type ApiResponse, type PublicTrackingResponse } from "@dhruto/contracts";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";

@ApiTags("Tracking")
@Controller("tracking")
export class TrackingController {
  constructor(private readonly parcelsService: ParcelsService) {}

  @Get(":trackingCode")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Public parcel tracking",
    description:
      "Returns public-safe parcel tracking status, route timeline (EN & BN), and masked customer information.",
  })
  @ApiOkResponse({ description: "Tracking information retrieved successfully" })
  @ApiNotFoundResponse({ description: "Tracking code not found" })
  async getTracking(
    @Param("trackingCode") trackingCode: string,
    @Req() req: RequestWithId,
  ): Promise<ApiResponse<PublicTrackingResponse>> {
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
