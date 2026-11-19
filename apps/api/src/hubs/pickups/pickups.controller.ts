import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  assignPickupSchema,
  confirmPickupSchema,
  type AssignPickupRequest,
  type ConfirmPickupRequest,
} from "@dhruto/contracts";
import { Roles } from "../../auth/decorators/roles.decorator.js";
import { UserRole } from "../../database/entities/index.js";
import { CurrentUser } from "../../auth/decorators/current-user.decorator.js";
import { type AuthenticatedUser } from "../../auth/jwt/jwt.interface.js";
import { HUB_OPERATION_ROLES } from "../../common/permissions/hub-permissions.js";
import { RateLimitGuard } from "../../common/rate-limit/rate-limit.guard.js";
import { RateLimit } from "../../common/rate-limit/rate-limit.decorator.js";
import { ZodValidationPipe } from "../../chat/pipes/zod-validation.pipe.js";
import { PickupService } from "./pickup.service.js";

const ok = <T>(message: string, data: T) => ({ success: true, statusCode: HttpStatus.OK, message, data });

/**
 * First-mile pickups. Hub staff see and assign pickup requests for merchants
 * in their hub's district; riders list and confirm their assigned pickups.
 * Hub access is re-validated per call by HubAuthorizationService.
 */
@ApiTags("Pickups")
@ApiBearerAuth()
@UseGuards(RateLimitGuard)
@Controller()
export class PickupsController {
  constructor(private readonly pickups: PickupService) {}

  @Get("hubs/:id/pickup-requests")
  @Roles(...HUB_OPERATION_ROLES)
  @ApiOperation({ summary: "Pending merchant pickups routed to this hub, grouped per merchant" })
  async list(@Param("id") hubId: string, @CurrentUser() user: AuthenticatedUser) {
    return ok("Pickup requests retrieved successfully", await this.pickups.listRequests(user, hubId));
  }

  @Post("hubs/:id/pickups/assign")
  @HttpCode(HttpStatus.OK)
  @Roles(...HUB_OPERATION_ROLES)
  @RateLimit({ limit: 120, windowSeconds: 60, scope: "pickup-assign" })
  @ApiOperation({ summary: "Assign a pickup rider to requested parcels (PICKUP_ASSIGNED)" })
  async assign(
    @Param("id") hubId: string,
    @Body(new ZodValidationPipe(assignPickupSchema)) body: AssignPickupRequest,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return ok("Pickup rider assigned", await this.pickups.assignRider(user, hubId, body));
  }

  @Get("riders/me/pickups")
  @Roles(UserRole.RIDER)
  @ApiOperation({ summary: "The rider's assigned merchant pickups" })
  async mine(@CurrentUser() user: AuthenticatedUser) {
    return ok("Assigned pickups retrieved successfully", await this.pickups.listForRider(user));
  }

  @Post("riders/me/pickups/confirm")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.RIDER)
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "pickup-confirm" })
  @ApiOperation({ summary: "Confirm parcels were collected from the merchant (PICKED_UP)" })
  async confirm(
    @Body(new ZodValidationPipe(confirmPickupSchema)) body: ConfirmPickupRequest,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return ok("Pickup confirmed", await this.pickups.confirmPickup(user, body));
  }
}
