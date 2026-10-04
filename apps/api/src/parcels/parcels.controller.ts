import {
  Controller,
  Post,
  Body,
  HttpStatus,
  Req,
  Headers,
  HttpCode,
  Get,
  Param,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnprocessableEntityResponse,
  ApiBadRequestResponse,
  ApiHeader,
  ApiQuery,
} from "@nestjs/swagger";
import { ParcelsService } from "./parcels.service.js";
import { CreateParcelDto } from "./dto/create-parcel.dto.js";
import { ParcelResponseDto } from "./dto/parcel-response.dto.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";
import {
  type ApiResponse,
  type ParcelCreatedResponse,
  type ParcelDetailsResponse,
  type ShippingLabelResponse,
  ParcelStatus,
} from "@dhruto/contracts";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import { CustomJwtService } from "../auth/jwt/custom-jwt.service.js";

@ApiTags("Parcels")
@Controller("parcels")
export class ParcelsController {
  constructor(
    private readonly parcelsService: ParcelsService,
    private readonly jwtService: CustomJwtService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a new parcel booking",
    description:
      "Validates parcel booking payload against shared @dhruto/contracts schema, calculates dynamic pricing, supports Idempotency-Key, and creates a parcel in CREATED state.",
  })
  @ApiHeader({
    name: "Idempotency-Key",
    required: false,
    description: "Unique idempotency key to prevent duplicate booking submissions",
  })
  @ApiCreatedResponse({
    description: "Parcel booking created successfully",
    type: ParcelResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: "Validation failed due to invalid fields",
  })
  @ApiBadRequestResponse({
    description: "Bad request payload format",
  })
  async createParcel(
    @Body() createParcelDto: CreateParcelDto,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
  ): Promise<ApiResponse<ParcelCreatedResponse>> {
    let userId = user?.id;
    if (!userId) {
      const authHeader = (req as any)?.headers?.authorization;
      if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7);
          const payload = this.jwtService.verifyAccessToken(token);
          if (payload?.sub) {
            userId = payload.sub;
          }
        } catch {
          // Ignore invalid token and use default fallback
        }
      }
    }

    const parcel = await this.parcelsService.createParcel(
      createParcelDto,
      idempotencyKey,
      userId,
    );

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

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "List parcel bookings",
    description: "Returns a filtered list of parcel bookings.",
  })
  @ApiQuery({ name: "status", required: false, enum: ParcelStatus })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async findAll(
    @Query("status") status: ParcelStatus | undefined,
    @Query("search") search: string | undefined,
    @Query("limit") limit: number | undefined,
    @Req() req: RequestWithId,
  ) {
    const parcels = await this.parcelsService.findAll({
      status,
      search,
      limit: limit ? Number(limit) : undefined,
    });

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Parcels retrieved successfully",
      data: parcels,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get parcel details",
    description: "Retrieves complete parcel details including full status history and assigned rider.",
  })
  @ApiOkResponse({ description: "Parcel details retrieved successfully" })
  async getParcelById(
    @Param("id") id: string,
    @Req() req: RequestWithId,
  ): Promise<ApiResponse<ParcelDetailsResponse>> {
    const parcel = await this.parcelsService.getParcelById(id);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Parcel details retrieved successfully",
      data: parcel,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get(":id/label")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get parcel shipping label",
    description: "Retrieves 4x6 shipping label metadata and vector SVG barcode for thermal printing.",
  })
  @ApiOkResponse({ description: "Shipping label retrieved successfully" })
  async getShippingLabel(
    @Param("id") id: string,
    @Req() req: RequestWithId,
  ): Promise<ApiResponse<ShippingLabelResponse>> {
    const label = await this.parcelsService.getShippingLabel(id);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Shipping label retrieved successfully",
      data: label,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post(":id/assign-rider")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Assign parcel to a rider",
    description: "Transitions parcel to ASSIGNED_TO_RIDER and registers assignment.",
  })
  async assignRider(
    @Param("id") id: string,
    @Body("riderId") riderId: string,
    @Req() req: RequestWithId,
  ) {
    const result = await this.parcelsService.assignRider(id, riderId);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: result.message,
      data: result,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }
}
