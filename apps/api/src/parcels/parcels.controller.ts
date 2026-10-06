import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { ApiErrorCode, ParcelStatus } from "@dhruto/contracts";
import { ParcelsService } from "./parcels.service.js";
import { CreateParcelDto } from "./dto/create-parcel.dto.js";
import { ParcelResponseDto } from "./dto/parcel-response.dto.js";
import { ParcelListQueryDto } from "./dto/parcel-list-query.dto.js";
import {
  ParcelDetailsResponseDto,
  ParcelHistoryResponseDto,
} from "./dto/parcel-details-response.dto.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { UserRole } from "../database/entities/User.entity.js";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard.js";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator.js";

@ApiTags("Parcels")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Roles(UserRole.MERCHANT, UserRole.ADMIN)
@Controller("parcels")
export class ParcelsController {
  constructor(private readonly parcelsService: ParcelsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "parcel-create" })
  @ApiOperation({
    summary: "Create a parcel booking",
    description:
      "Creates a parcel for the authenticated merchant. The delivery fee is calculated server-side. " +
      "The `Idempotency-Key` header is required: repeating the same key with the same payload replays the original " +
      "result, while reusing it with a different payload returns 409.",
  })
  @ApiHeader({
    name: "Idempotency-Key",
    required: true,
    description: "Unique key (16-128 chars) identifying this booking attempt",
  })
  @ApiCreatedResponse({
    description: "Parcel booking created successfully",
    type: ParcelResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Missing Idempotency-Key or malformed payload",
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiForbiddenResponse({ description: "Caller has no merchant profile" })
  @ApiConflictResponse({
    description: "Idempotency-Key reused with a different payload, or still in progress",
  })
  @ApiUnprocessableEntityResponse({ description: "Validation failed" })
  @ApiTooManyRequestsResponse({ description: "Rate limit exceeded" })
  async createParcel(
    @Body() dto: CreateParcelDto,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    if (!idempotencyKey || !idempotencyKey.trim()) {
      throw new BadRequestException({
        message:
          "Idempotency-Key header is required for parcel creation requests",
        error: ApiErrorCode.IDEMPOTENCY_KEY_REQUIRED,
      });
    }

    const data = await this.parcelsService.createParcel(dto, {
      user,
      idempotencyKey,
    });

    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: "Parcel booking created successfully",
      data,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 120, windowSeconds: 60, scope: "parcel-list" })
  @ApiOperation({
    summary: "List the merchant's parcels",
    description:
      "Paginated, searchable and filterable parcel list. Results are always scoped to the authenticated merchant.",
  })
  @ApiOkResponse({ description: "Paginated parcel list", type: ParcelResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiTooManyRequestsResponse({ description: "Rate limit exceeded" })
  async listParcels(
    @Query() query: ParcelListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const scope = await this.parcelsService.resolveScope(user);
    const { items, pagination } = await this.parcelsService.listParcels(
      query,
      scope,
    );

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Parcels retrieved successfully",
      data: items,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
        pagination,
      },
    };
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 180, windowSeconds: 60, scope: "parcel-details" })
  @ApiOperation({
    summary: "Get parcel details by id or tracking code",
    description:
      "Returns the parcel, its destination, pricing and immutable status history. A parcel owned by another merchant is reported as 404.",
  })
  @ApiOkResponse({ description: "Parcel details", type: ParcelDetailsResponseDto })
  @ApiNotFoundResponse({ description: "Parcel not found or not owned by caller" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  async getParcelById(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const scope = await this.parcelsService.resolveScope(user);
    const data = await this.parcelsService.getParcelById(id, scope);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Parcel details retrieved successfully",
      data,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get(":id/history")
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 180, windowSeconds: 60, scope: "parcel-history" })
  @ApiOperation({
    summary: "Get parcel status history",
    description: "Returns the append-only lifecycle history for a parcel.",
  })
  @ApiOkResponse({
    description: "Parcel history",
    type: ParcelHistoryResponseDto,
    isArray: true,
  })
  @ApiNotFoundResponse({ description: "Parcel not found or not owned by caller" })
  async getParcelHistory(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const scope = await this.parcelsService.resolveScope(user);
    const data = await this.parcelsService.getParcelHistory(id, scope);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Parcel history retrieved successfully",
      data,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get(":id/label")
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "parcel-label" })
  @ApiOperation({
    summary: "Get the 4x6 shipping label",
    description:
      "Returns label data plus a Code128 barcode (SVG) encoding the tracking code. Scoped to the owning merchant.",
  })
  @ApiOkResponse({ description: "Shipping label payload" })
  @ApiNotFoundResponse({ description: "Parcel not found or not owned by caller" })
  @ApiForbiddenResponse({ description: "Caller cannot access this label" })
  async getShippingLabel(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const scope = await this.parcelsService.resolveScope(user);
    const data = await this.parcelsService.getShippingLabel(id, scope);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Shipping label retrieved successfully",
      data,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post(":id/assign-rider")
  @Roles(UserRole.ADMIN, UserRole.HUB_MANAGER)
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "parcel-assign" })
  @ApiOperation({
    summary: "Assign a parcel to a rider (hub/admin only)",
    description:
      "Phase 3 operational command. Status transitions are validated by the centralized state machine.",
  })
  @ApiOkResponse({ description: "Parcel assigned" })
  @ApiForbiddenResponse({ description: "Caller is not an admin or hub manager" })
  @ApiNotFoundResponse({ description: "Parcel or rider not found" })
  async assignRider(
    @Param("id") id: string,
    @Body("riderId") riderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const result = await this.parcelsService.assignRider(id, riderId, user);

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

/** Re-exported so generated OpenAPI enums stay in sync with the contract. */
export { ParcelStatus };
