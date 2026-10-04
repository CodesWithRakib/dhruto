import {
  Controller,
  Post,
  Body,
  HttpStatus,
  Req,
  HttpCode,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiUnprocessableEntityResponse,
  ApiBadRequestResponse,
} from "@nestjs/swagger";
import { ParcelsService } from "./parcels.service.js";
import { CreateParcelDto } from "./dto/create-parcel.dto.js";
import { ParcelResponseDto } from "./dto/parcel-response.dto.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";
import { type ApiResponse, type ParcelCreatedResponse } from "@dhruto/contracts";

@ApiTags("Parcels")
@Controller("parcels")
export class ParcelsController {
  constructor(private readonly parcelsService: ParcelsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a new parcel booking",
    description:
      "Validates parcel booking payload against shared @dhruto/contracts schema and creates a parcel in CREATED state.",
  })
  @ApiCreatedResponse({
    description: "Parcel booking created successfully",
    type: ParcelResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description:
      "Validation failed due to invalid fields (e.g., invalid phone format, negative COD)",
  })
  @ApiBadRequestResponse({
    description: "Bad request payload format",
  })
  async createParcel(
    @Body() createParcelDto: CreateParcelDto,
    @Req() req: RequestWithId,
  ): Promise<ApiResponse<ParcelCreatedResponse>> {
    const parcel = await this.parcelsService.createParcel(createParcelDto);

    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: "Parcel booking created successfully",
      data: parcel,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }
}
