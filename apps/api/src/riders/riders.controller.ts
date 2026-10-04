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
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { RidersService } from "./riders.service.js";
import {
  VerifyOtpDto,
  CompleteDeliveryDto,
  FailDeliveryDto,
  CashHandInDto,
} from "./dto/rider-delivery.dto.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { UserRole, ParcelStatus } from "../database/entities/index.js";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";

@ApiTags("Riders")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard)
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

  @Get("me/tasks")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get assigned delivery and pickup tasks for the rider",
    description: "Returns all parcels currently assigned to the authenticated rider.",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ParcelStatus,
    description: "Filter tasks by parcel status",
  })
  async getMyTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Query("status") status?: ParcelStatus,
    @Req() req?: RequestWithId,
  ) {
    const riderId = await this.resolveRiderId(user);
    const tasks = await this.ridersService.getAssignedTasks(riderId, status);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Rider tasks retrieved successfully",
      data: tasks,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("me/parcels/:parcelId/start-delivery")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Start out-for-delivery run on an assigned parcel",
    description: "Transitions parcel status to OUT_FOR_DELIVERY and generates delivery verification OTP.",
  })
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

  @Post("me/deliveries/:parcelId/verify-otp")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Verify customer delivery OTP code",
  })
  async verifyOtp(
    @CurrentUser() user: AuthenticatedUser,
    @Param("parcelId") parcelId: string,
    @Body() dto: VerifyOtpDto,
    @Req() req: RequestWithId,
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

  @Post("me/deliveries/:parcelId/complete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Complete parcel delivery and record COD cash collection",
    description: "Transitions parcel to DELIVERED / CASH_PENDING and registers cash ledger.",
  })
  async completeDelivery(
    @CurrentUser() user: AuthenticatedUser,
    @Param("parcelId") parcelId: string,
    @Body() dto: CompleteDeliveryDto,
    @Req() req: RequestWithId,
  ) {
    const riderId = await this.resolveRiderId(user);
    const result = await this.ridersService.completeDelivery(
      riderId,
      parcelId,
      dto,
      user.id,
    );

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

  @Post("me/deliveries/:parcelId/fail")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Record delivery attempt failure or reschedule",
    description: "Transitions parcel to DELIVERY_ATTEMPTED or RESCHEDULED with explicit reason.",
  })
  async failDelivery(
    @CurrentUser() user: AuthenticatedUser,
    @Param("parcelId") parcelId: string,
    @Body() dto: FailDeliveryDto,
    @Req() req: RequestWithId,
  ) {
    const riderId = await this.resolveRiderId(user);
    const result = await this.ridersService.failDelivery(
      riderId,
      parcelId,
      dto,
      user.id,
    );

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

  @Post("me/cash/hand-in")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Hand in collected cash to hub manager",
    description: "Submits all pending collected COD cash for hub manager verification.",
  })
  async handInCash(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CashHandInDto,
    @Req() req: RequestWithId,
  ) {
    const riderId = await this.resolveRiderId(user);
    const result = await this.ridersService.handInCash(riderId, user.id, dto);

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

  @Get("me/cash/summary")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get rider's cash collection and reconciliation summary",
  })
  async getCashSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const riderId = await this.resolveRiderId(user);
    const summary = await this.ridersService.getCashSummary(riderId);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Cash summary retrieved successfully",
      data: summary,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }
}
