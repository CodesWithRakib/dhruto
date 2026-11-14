import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { UpdateParcelDto } from "./dto/update-parcel.dto.js";
import { RequestPickupDto, BatchRequestPickupDto } from "./dto/request-pickup.dto.js";
import { AssignRiderDto } from "./dto/assign-rider.dto.js";
import { BulkImportDto, MAX_BULK_ROWS } from "./dto/bulk-import.dto.js";
import { ParcelResponseDto } from "./dto/parcel-response.dto.js";
import { ParcelListQueryDto } from "./dto/parcel-list-query.dto.js";
import {
  ParcelDetailsResponseDto,
  ParcelHistoryResponseDto,
} from "./dto/parcel-details-response.dto.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { UserRole } from "../database/entities/User.entity.js";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard.js";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator.js";

@ApiTags("Parcels")
@ApiBearerAuth("JWT-auth")
@UseGuards(RateLimitGuard)
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
        message: "Idempotency-Key header is required for parcel creation requests",
        error: ApiErrorCode.IDEMPOTENCY_KEY_REQUIRED,
      });
    }
    // Phase 3 (T-IDEM-01): enforce the documented 16–128 char contract.
    // Shorter keys collide too easily across merchants; longer keys exceed
    // the idempotency_records.key column (varchar 128).
    const trimmedKey = idempotencyKey.trim();
    if (trimmedKey.length < 16 || trimmedKey.length > 128) {
      throw new BadRequestException({
        message: "Idempotency-Key must be between 16 and 128 characters",
        error: ApiErrorCode.VALIDATION_ERROR,
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
  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.CUSTOMER)
  async listParcels(
    @Query() query: ParcelListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const scope = await this.parcelsService.resolveScope(user);
    const { items, pagination } = await this.parcelsService.listParcels(query, scope);

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
  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.CUSTOMER)
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

  @Get(":id/delivery-otp")
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "parcel-otp" })
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  @ApiOperation({
    summary: "Get unique delivery OTP for parcel recipient",
    description: "Returns the unique 6-digit delivery OTP for the authenticated recipient.",
  })
  async getDeliveryOtp(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const scope = await this.parcelsService.resolveScope(user);
    const data = await this.parcelsService.getParcelDeliveryOtp(id, scope);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Delivery OTP retrieved successfully",
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
    @Body() dto: AssignRiderDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const result = await this.parcelsService.assignRider(id, dto.riderId, user);

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

  @Post(":id/cancel")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "parcel-cancel" })
  @ApiOperation({
    summary: "Cancel a parcel inside the pre-pickup window",
    description:
      "Phase 3 operational command. Allowed from CREATED, PICKUP_REQUESTED and PICKUP_ASSIGNED only; merchants cancel their own parcels. Repeating a cancel replays the cancelled state.",
  })
  @ApiOkResponse({ description: "Parcel cancelled" })
  @ApiNotFoundResponse({ description: "Parcel not found" })
  async cancelParcel(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const result = await this.parcelsService.cancelParcel(id, user);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Parcel cancelled successfully",
      data: result,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Patch(":id")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "parcel-update" })
  @ApiOperation({
    summary: "Update parcel recipient and delivery details pre-pickup",
    description:
      "Allowed only while parcel is in CREATED or PICKUP_REQUESTED status. Merchants can edit their own parcels; admins can edit any.",
  })
  @ApiOkResponse({ description: "Parcel updated successfully" })
  @ApiNotFoundResponse({ description: "Parcel not found" })
  @ApiConflictResponse({ description: "Parcel cannot be edited in its current status" })
  async updateParcel(
    @Param("id") id: string,
    @Body() dto: UpdateParcelDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const result = await this.parcelsService.updateParcel(id, dto, user);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Parcel details updated successfully",
      data: result,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("batch/request-pickup")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "parcel-pickup" })
  @ApiOperation({
    summary: "Request pickup for multiple parcels in CREATED status",
    description:
      "Operational command allowing merchants or admins to transition multiple booked parcels from CREATED to PICKUP_REQUESTED.",
  })
  @ApiOkResponse({ description: "Pickup requested for batch parcels" })
  async batchRequestPickup(
    @Body() dto: BatchRequestPickupDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const result = await this.parcelsService.batchRequestPickup(dto.parcelIds, user, dto.notes);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: `Pickup requested successfully for ${result.requestedCount} parcel(s)`,
      data: result,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post(":id/request-pickup")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "parcel-pickup" })
  @ApiOperation({
    summary: "Request pickup for a parcel in CREATED status",
    description:
      "Operational command allowing merchants or admins to transition a booked parcel from CREATED to PICKUP_REQUESTED. Replaying on an already requested parcel is idempotent.",
  })
  @ApiOkResponse({ description: "Pickup requested" })
  @ApiNotFoundResponse({ description: "Parcel not found" })
  async requestPickup(
    @Param("id") id: string,
    @Body() dto: RequestPickupDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const result = await this.parcelsService.requestPickup(id, user, dto?.notes);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Pickup requested successfully",
      data: result,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post(":id/rto")
  @Roles(UserRole.ADMIN, UserRole.HUB_MANAGER)
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "parcel-rto" })
  @ApiOperation({
    summary: "Initiate return-to-origin from a failed delivery",
    description:
      "Phase 3 operational command. Allowed from DELIVERY_ATTEMPTED only; hub managers and admins. Repeating initiation replays the RTO state.",
  })
  @ApiOkResponse({ description: "Return-to-origin initiated" })
  @ApiNotFoundResponse({ description: "Parcel not found" })
  async initiateRto(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const result = await this.parcelsService.initiateRto(id, user);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Return-to-origin initiated successfully",
      data: result,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post(":id/rto-advance")
  @Roles(UserRole.ADMIN, UserRole.HUB_MANAGER)
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "parcel-rto" })
  @ApiOperation({
    summary: "Move an initiated return onto its return leg",
    description:
      "Phase 4 operational command. Allowed from RTO_INITIATED only; hub managers are scoped to the parcel's current hub. Repeating the advance replays the state.",
  })
  @ApiOkResponse({ description: "Return in transit" })
  @ApiNotFoundResponse({ description: "Parcel not found" })
  async advanceRto(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const result = await this.parcelsService.advanceRto(id, user);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Return marked in transit successfully",
      data: result,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post(":id/rto-complete")
  @Roles(UserRole.ADMIN, UserRole.HUB_MANAGER)
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "parcel-rto" })
  @ApiOperation({
    summary: "Complete a return to the merchant",
    description:
      "Phase 4 operational command. Allowed from RETURN_IN_TRANSIT only; emits the PARCEL_RETURNED domain event for merchant notifications and webhooks. Repeating the completion replays without duplicating the event.",
  })
  @ApiOkResponse({ description: "Return completed" })
  @ApiNotFoundResponse({ description: "Parcel not found" })
  async completeRto(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const result = await this.parcelsService.completeRto(id, user);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Parcel returned to merchant successfully",
      data: result,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get("bulk/template")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "CSV column template for bulk import",
    description:
      "Phase 6 (Q-BULK): column order and a sample row for converting CSV/XLSX files to the bulk import payload. No data is created.",
  })
  @ApiOkResponse({ description: "Bulk template" })
  async bulkTemplate(@Req() req: RequestWithId) {
    const columns = [
      "recipientName",
      "recipientPhone",
      "district",
      "thana",
      "deliveryAddress",
      "parcelDescription",
      "codAmount",
      "weight",
    ];
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Bulk import template retrieved successfully",
      data: {
        columns,
        maxRows: MAX_BULK_ROWS,
        csvHeader: columns.join(","),
        sample: [
          "Rahim Uddin",
          "01712345678",
          "Dhaka",
          "Mirpur",
          "House 1, Road 1, Mirpur, Dhaka",
          "",
          1200,
          1.5,
        ].join(","),
      },
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("bulk/validate")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 10, windowSeconds: 60, scope: "parcel-bulk" })
  @ApiOperation({
    summary: "Dry-run a bulk batch (pricing preview, persists nothing)",
    description: `Phase 6 (Q-BULK): validates up to ${MAX_BULK_ROWS} rows and quotes per-row delivery fees with server-side pricing.`,
  })
  @ApiOkResponse({ description: "Bulk validation preview" })
  async validateBulk(@Body() dto: BulkImportDto, @Req() req: RequestWithId) {
    const rows = this.parcelsService.validateBulkRows(dto.rows);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Bulk batch validated successfully",
      data: {
        total: rows.length,
        quotable: rows.filter((r) => r.ok).length,
        rows,
      },
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("bulk/import")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  // 20/min per authenticated merchant (not lower): writes are attributed
  // and per-row idempotent, so brute force is meaningless; the limit only
  // bounds batch-burst abuse. Shared-counter note: e2e must budget ≤20
  // import calls per merchant per 60s window across reruns (see bulk spec).
  @RateLimit({ limit: 20, windowSeconds: 60, scope: "parcel-bulk" })
  @ApiOperation({
    summary: "Import a bulk batch of parcels",
    description:
      "Phase 6 (Q-BULK): every row runs the single-booking pipeline. The batch `Idempotency-Key` (16-64 chars) derives per-row keys, so retrying a batch replays instead of duplicating. One bad row never aborts the rest.",
  })
  @ApiHeader({
    name: "Idempotency-Key",
    required: true,
    description: "Unique batch key (16-64 chars); per-row keys derive from it",
  })
  @ApiCreatedResponse({ description: "Bulk import completed with per-row results" })
  @ApiBadRequestResponse({ description: "Missing/invalid batch key or malformed payload" })
  async importBulk(
    @Body() dto: BulkImportDto,
    @Headers("idempotency-key") batchKey: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const trimmed = batchKey?.trim() ?? "";
    if (trimmed.length < 16 || trimmed.length > 64) {
      throw new BadRequestException({
        message: "Idempotency-Key batch key must be between 16 and 64 characters",
        error: ApiErrorCode.IDEMPOTENCY_KEY_REQUIRED,
      });
    }

    const result = await this.parcelsService.importBulk(dto, trimmed, user);

    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: `Bulk import completed: ${result.created} created, ${result.failed} failed`,
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
