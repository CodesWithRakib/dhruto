import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { IntegrationsAdminService } from "./integrations-admin.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { UserRole } from "../database/entities/index.js";
import { IntegrationFailureStatus } from "@dhruto/contracts";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard.js";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator.js";

function envelope(statusCode: number, message: string, data: unknown, req?: RequestWithId) {
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

/**
 * Admin integration operations: queue health, dead-letter inspection and
 * replay, outbox management. All routes are admin-only — queue
 * administration is never exposed publicly.
 */
@ApiTags("Integrations")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Roles(UserRole.ADMIN)
@Controller("admin/integrations")
export class IntegrationsAdminController {
  constructor(private readonly integrations: IntegrationsAdminService) {}

  @Get("overview")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Integration health overview",
    description: "Queue counters, provider modes, dead-letter size and 24h failure rates.",
  })
  @ApiResponse({ status: 200, description: "Overview." })
  async getOverview(@Req() req?: RequestWithId) {
    const overview = await this.integrations.integrationOverview();
    return envelope(HttpStatus.OK, "Integration overview retrieved successfully", overview, req);
  }

  @Get("queues")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Queue counters (waiting/active/completed/failed/delayed)" })
  @ApiResponse({ status: 200, description: "Queue health." })
  async getQueues(@Req() req?: RequestWithId) {
    const queues = await this.integrations.queuesOverview();
    return envelope(HttpStatus.OK, "Queue health retrieved successfully", queues, req);
  }

  @Get("failures")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Dead-letter entries with filters" })
  @ApiQuery({ name: "queue", required: false })
  @ApiQuery({ name: "status", required: false, enum: IntegrationFailureStatus })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Dead-letter page." })
  async listFailures(
    @Query("queue") queue?: string,
    @Query("status") status?: IntegrationFailureStatus,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Req() req?: RequestWithId,
  ) {
    const result = await this.integrations.listFailures({
      queue,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    return envelope(HttpStatus.OK, "Dead-letter entries retrieved successfully", result, req);
  }

  @Post("failures/:id/replay")
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "dlq-replay" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Replay a dead-letter entry",
    description:
      "Requeues the referenced delivery idempotently; domain effects are never duplicated.",
  })
  @ApiResponse({ status: 200, description: "Replayed." })
  @ApiResponse({ status: 404, description: "Failure not found." })
  async replayFailure(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const result = await this.integrations.replayFailure(id, user.id);
    return envelope(HttpStatus.OK, "Dead-letter entry replayed", result, req);
  }

  @Post("failures/:id/resolve")
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "dlq-resolve" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark a dead-letter entry resolved without replay" })
  @ApiResponse({ status: 200, description: "Resolved." })
  async resolveFailure(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const result = await this.integrations.resolveFailure(id, user.id);
    return envelope(HttpStatus.OK, "Dead-letter entry resolved", result, req);
  }

  @Get("outbox")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Outbox stats and failed events" })
  @ApiResponse({ status: 200, description: "Outbox overview." })
  async getOutbox(@Req() req?: RequestWithId) {
    const [stats, failed] = await Promise.all([
      this.integrations.outboxOverview(),
      this.integrations.outboxFailed(50),
    ]);
    return envelope(
      HttpStatus.OK,
      "Outbox overview retrieved successfully",
      { stats, failed },
      req,
    );
  }

  @Post("outbox/:id/replay")
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "outbox-replay" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Requeue a failed outbox event" })
  @ApiResponse({ status: 200, description: "Requeued." })
  async replayOutbox(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Req() req?: RequestWithId,
  ) {
    const result = await this.integrations.replayOutbox(id);
    return envelope(HttpStatus.OK, "Outbox event requeued", result, req);
  }
}
