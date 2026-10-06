import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  Req,
  Headers,
  BadRequestException,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiHeader,
  ApiResponse,
} from "@nestjs/swagger";
import { RidersService } from "./riders.service.js";
import {
  VerifyOtpDto,
  RequestOtpDto,
  CompleteDeliveryDto,
  FailDeliveryDto,
  CashHandInDto,
  SetDutyDto,
} from "./dto/rider-delivery.dto.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { UserRole, ParcelStatus } from "../database/entities/index.js";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard.js";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator.js";

function envelope(
  statusCode: number,
  message: string,
  data: unknown,
  req?: RequestWithId,
) {
  return {
    success: true,
    statusCode,
    message,
    data,
    meta: {
      requestId: req?.requestId || "unknown",
      timestamp: new Date().toISOString(),
    },
  };
}

@ApiTags("Riders")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Roles(UserRole.RIDER, UserRole.ADMIN)
@Controller("riders")
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  /**
   * Helper to resolve rider ID from token or database.
   */
  private async resolveRiderId(user: AuthenticatedUser): Promise<string> {
    if (user.riderId) {
      return user.riderId;
    }
    const rider = await this.ridersService.getRiderByUserId(user.id);
    return rider.id;
  }

  @Get("me/dashboard")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Rider operational dashboard",
    description:
      "Live counts of assigned, in-progress and today's completed/failed tasks plus COD still to collect. All numbers are real aggregates.",
  })
  @ApiResponse({ status: 200, description: "Dashboard aggregates." })
  @ApiResponse({ status: 403, description: "Rider is inactive or off duty." })
  async getDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const riderId = await this.resolveRiderId(user);
    const dashboard = await this.ridersService.getDashboard(riderId);
    return envelope(HttpStatus.OK, "Rider dashboard retrieved successfully", dashboard, req);
  }

  @Get("me/tasks")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get assigned delivery and pickup tasks for the rider",
    description:
      "Returns parcels currently assigned to the authenticated rider. Never exposes the OTP secret or merchant internals.",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ParcelStatus,
    description: "Filter tasks by parcel status",
  })
  @ApiResponse({ status: 200, description: "Rider tasks." })
  async getMyTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Query("status") status?: ParcelStatus,
    @Req() req?: RequestWithId,
  ) {
    const riderId = await this.resolveRiderId(user);
    const tasks = await this.ridersService.getAssignedTasks(riderId, status);

    return envelope(HttpStatus.OK, "Rider tasks retrieved successfully", tasks, req);
  }

  @Get("me/tasks/:parcelId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Task details with the delivery attempt trail",
    description:
      "Customer handoff screen: recipient, address, COD, OTP state and every recorded attempt for this parcel.",
  })
  @ApiResponse({ status: 200, description: "Task details." })
  @ApiResponse({ status: 403, description: "Task belongs to another rider." })
  @ApiResponse({ status: 404, description: "Parcel not found." })
  async getTaskDetails(
    @CurrentUser() user: AuthenticatedUser,
    @Param("parcelId", new ParseUUIDPipe({ version: "4" })) parcelId: string,
    @Req() req?: RequestWithId,
  ) {
    const riderId = await this.resolveRiderId(user);
    const details = await this.ridersService.getTaskDetails(riderId, parcelId);
    return envelope(HttpStatus.OK, "Task details retrieved successfully", details, req);
  }

  @Get("me/history")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Completed and failed delivery history",
    description: "Paginated, newest first. Only the rider's own deliveries.",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, enum: ParcelStatus })
  @ApiResponse({ status: 200, description: "Delivery history page." })
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: ParcelStatus,
    @Req() req?: RequestWithId,
  ) {
    const riderId = await this.resolveRiderId(user);
    const history = await this.ridersService.getHistory(riderId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
    });
    return envelope(HttpStatus.OK, "Delivery history retrieved successfully", history, req);
  }

  @Get("me/profile")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Rider profile for the terminal",
    description: "Rider code, hub, duty state and joined date. No sensitive data.",
  })
  @ApiResponse({ status: 200, description: "Rider profile." })
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const riderId = await this.resolveRiderId(user);
    const profile = await this.ridersService.getProfile(riderId, user);
    return envelope(HttpStatus.OK, "Rider profile retrieved successfully", profile, req);
  }

  @Post("me/duty")
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "rider-duty" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Switch rider duty state",
    description:
      "Going off duty with parcels still out for delivery is rejected so work is never abandoned silently.",
  })
  @ApiResponse({ status: 200, description: "Duty state updated." })
  @ApiResponse({ status: 409, description: "Parcels still out for delivery." })
  async setDuty(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetDutyDto,
    @Req() req?: RequestWithId,
  ) {
    const riderId = await this.resolveRiderId(user);
    const profile = await this.ridersService.setDuty(riderId, dto.duty);
    return envelope(HttpStatus.OK, "Duty status updated", profile, req);
  }

  @Post("me/parcels/:parcelId/start-delivery")
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "rider-start" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Start out-for-delivery run on an assigned parcel",
    description:
      "Transitions parcel status to OUT_FOR_DELIVERY and issues a hashed customer OTP (15 minute TTL) via SMS. The secret is never returned to the rider UI.",
  })
  @ApiResponse({ status: 200, description: "Delivery started." })
  @ApiResponse({ status: 403, description: "Parcel belongs to another rider or rider is inactive." })
  async startDelivery(
    @CurrentUser() user: AuthenticatedUser,
    @Param("parcelId") parcelId: string,
    @Req() req: RequestWithId,
  ) {
    const riderId = await this.resolveRiderId(user);
    const result = await this.ridersService.startDelivery(
      riderId,
      parcelId,
      user.id,
    );

    return envelope(HttpStatus.OK, result.message, result, req);
  }

  @Post("me/deliveries/:parcelId/otp")
  @RateLimit({ limit: 5, windowSeconds: 60, scope: "rider-otp-request" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Request a fresh customer OTP",
    description:
      "60 second cooldown between requests, at most 5 generations per delivery leg. Previous OTPs are invalidated.",
  })
  @ApiResponse({ status: 200, description: "OTP re-issued." })
  @ApiResponse({ status: 429, description: "Cooldown active or request limit reached." })
  async requestOtp(
    @CurrentUser() user: AuthenticatedUser,
    @Param("parcelId") parcelId: string,
    @Body() _dto: RequestOtpDto,
    @Req() req?: RequestWithId,
  ) {
    const riderId = await this.resolveRiderId(user);
    const result = await this.ridersService.requestOtp(riderId, parcelId);
    return envelope(HttpStatus.OK, "OTP sent to the customer", result, req);
  }

  @Post("me/deliveries/:parcelId/verify-otp")
  @RateLimit({ limit: 10, windowSeconds: 60, scope: "rider-otp-verify" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Verify customer delivery OTP code",
    description:
      "5 wrong guesses lock the OTP until a fresh one is requested. An already-verified OTP replays success without side effects.",
  })
  @ApiResponse({ status: 200, description: "OTP verified." })
  @ApiResponse({ status: 400, description: "Invalid or expired OTP." })
  @ApiResponse({ status: 429, description: "OTP locked after too many attempts." })
  async verifyOtp(
    @CurrentUser() user: AuthenticatedUser,
    @Param("parcelId") parcelId: string,
    @Body() dto: VerifyOtpDto,
    @Req() req?: RequestWithId,
  ) {
    const riderId = await this.resolveRiderId(user);
    const result = await this.ridersService.verifyOtp(
      riderId,
      parcelId,
      dto.otp,
    );

    if (!result.valid) {
      throw new BadRequestException(result.message || "Invalid OTP code");
    }

    return envelope(HttpStatus.OK, result.message, result, req);
  }

  @Post("me/deliveries/:parcelId/complete")
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "rider-complete" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Complete parcel delivery and record COD cash collection",
    description:
      "Requires verified customer OTP and an exact COD match. Accepts an optional Idempotency-Key: repeats replay the recorded delivery instead of duplicating attempts, cash or history.",
  })
  @ApiHeader({
    name: "Idempotency-Key",
    required: false,
    description: "Optional key making duplicate completion submissions safe",
  })
  @ApiResponse({ status: 200, description: "Delivery completed (or replayed)." })
  @ApiResponse({ status: 409, description: "Already completed or key reused with another payload." })
  @ApiResponse({ status: 422, description: "OTP missing or COD amount mismatch." })
  async completeDelivery(
    @CurrentUser() user: AuthenticatedUser,
    @Param("parcelId") parcelId: string,
    @Body() dto: CompleteDeliveryDto,
    @Req() req: RequestWithId,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    const riderId = await this.resolveRiderId(user);
    const result = await this.ridersService.completeDelivery(
      riderId,
      parcelId,
      dto,
      user.id,
      idempotencyKey?.trim() || undefined,
    );

    return envelope(HttpStatus.OK, result.message, result, req);
  }

  @Post("me/deliveries/:parcelId/fail")
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "rider-fail" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Record delivery attempt failure or reschedule",
    description:
      "Every attempt is appended to the delivery log. A future reschedule date (max 7 days) moves the parcel to RESCHEDULED.",
  })
  @ApiResponse({ status: 200, description: "Attempt recorded." })
  @ApiResponse({ status: 422, description: "Invalid reschedule date." })
  async failDelivery(
    @CurrentUser() user: AuthenticatedUser,
    @Param("parcelId") parcelId: string,
    @Body() dto: FailDeliveryDto,
    @Req() req?: RequestWithId,
  ) {
    const riderId = await this.resolveRiderId(user);
    const result = await this.ridersService.failDelivery(
      riderId,
      parcelId,
      dto,
      user.id,
    );

    return envelope(HttpStatus.OK, result.message, result, req);
  }

  @Post("me/cash/hand-in")
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "rider-handin" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Hand in collected cash to hub manager",
    description:
      "Creates a persisted hand-in batch with a server-computed total and posts the custody transfer through the journal. Accepts an Idempotency-Key: repeats replay the recorded batch.",
  })
  @ApiHeader({ name: "Idempotency-Key", required: false, description: "Makes duplicate submissions safe" })
  @ApiResponse({ status: 200, description: "Cash handed in as a batch." })
  async handInCash(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CashHandInDto,
    @Req() req?: RequestWithId,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    const riderId = await this.resolveRiderId(user);
    const result = await this.ridersService.handInCash(
      riderId,
      user.id,
      dto,
      idempotencyKey?.trim() || undefined,
    );

    return envelope(HttpStatus.OK, result.message, result, req);
  }

  @Get("me/cash/handins")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Rider hand-in batches",
    description: "Batch custody records with server-computed totals and derived status.",
  })
  @ApiResponse({ status: 200, description: "Hand-in batches." })
  async getCashHandIns(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const riderId = await this.resolveRiderId(user);
    const batches = await this.ridersService.getCashHandIns(riderId);

    return envelope(HttpStatus.OK, "Hand-in batches retrieved successfully", batches, req);
  }

  @Get("me/cash/summary")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get rider's cash collection and reconciliation summary",
  })
  @ApiResponse({ status: 200, description: "Cash summary." })
  async getCashSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const riderId = await this.resolveRiderId(user);
    const summary = await this.ridersService.getCashSummary(riderId);

    return envelope(HttpStatus.OK, "Cash summary retrieved successfully", summary, req);
  }
}

/**
 * Hub/admin rider operations: fleet visibility and assignment support.
 * Hub managers only ever see riders of hubs they are assigned to.
 */
@ApiTags("Riders")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Roles(UserRole.ADMIN, UserRole.HUB_MANAGER)
@Controller("riders")
export class RiderAdminController {
  constructor(private readonly ridersService: RidersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "List riders with live task counts",
    description:
      "Supports the hub assignment workflow: rider code, hub, status, active tasks and today's deliveries.",
  })
  @ApiQuery({ name: "hubId", required: false, description: "Filter to one hub" })
  @ApiResponse({ status: 200, description: "Rider list." })
  async listRiders(
    @CurrentUser() user: AuthenticatedUser,
    @Query("hubId") hubId?: string,
    @Req() req?: RequestWithId,
  ) {
    const riders = await this.ridersService.listRiders(user, { hubId });
    return envelope(HttpStatus.OK, "Riders retrieved successfully", riders, req);
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Rider detail with active tasks and assignment history",
  })
  @ApiResponse({ status: 200, description: "Rider detail." })
  @ApiResponse({ status: 403, description: "Rider belongs to another hub." })
  @ApiResponse({ status: 404, description: "Rider not found." })
  async getRider(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Req() req?: RequestWithId,
  ) {
    const rider = await this.ridersService.getRiderDetails(user, id);
    // NOTE: shares the name with the rider-terminal detail helper; this is
    // the hub/admin fleet variant scoped by hub assignment.
    return envelope(HttpStatus.OK, "Rider retrieved successfully", rider, req);
  }
}
