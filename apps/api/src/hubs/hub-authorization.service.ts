import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { type HubPermission, HubStatus } from "@dhruto/contracts";
import { Hub, HubUserAssignment, UserRole } from "../database/entities/index.js";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import {
  HUB_OPERATION_ROLES,
  hasEffectivePermission,
} from "../common/permissions/hub-permissions.js";

/**
 * Single place where "may this authenticated actor operate on this hub?" is
 * answered. Every hub operation goes through `assertHubAccess`, so the rule
 * cannot drift between controllers or services.
 */
@Injectable()
export class HubAuthorizationService {
  constructor(
    @InjectRepository(Hub)
    private readonly hubRepo: Repository<Hub>,
    @InjectRepository(HubUserAssignment)
    private readonly assignmentRepo: Repository<HubUserAssignment>,
  ) {}

  /** Hub IDs the actor is explicitly assigned to. ADMIN sees every hub. */
  async listAuthorizedHubIds(user: AuthenticatedUser): Promise<string[]> {
    if (user.role === UserRole.ADMIN) {
      const hubs = await this.hubRepo.find({ select: ["id"] });
      return hubs.map((hub) => hub.id);
    }

    const assignments = await this.assignmentRepo.find({
      where: { userId: user.id, isActive: true },
      select: ["hubId"],
    });
    return assignments.map((assignment) => assignment.hubId);
  }

  /** Every hub the actor may see, for the hub selector (spec §107). */
  async listAuthorizedHubs(user: AuthenticatedUser): Promise<Hub[]> {
    if (user.role === UserRole.ADMIN) {
      return this.hubRepo.find({ order: { name: "ASC" } });
    }

    const hubIds = await this.listAuthorizedHubIds(user);
    if (hubIds.length === 0) return [];

    return this.hubRepo.find({
      where: { id: In(hubIds) },
      order: { name: "ASC" },
    });
  }

  /**
   * Resolves a hub by id (or code) and asserts the actor holds `permission`
   * there. Throws 404 when the hub does not exist and 403 when the actor is not
   * authorized — never leaking whether a hub the actor cannot see exists.
   */
  async assertHubAccess(
    user: AuthenticatedUser,
    hubIdOrCode: string,
    permission: HubPermission,
    options: { requireActive?: boolean } = {},
  ): Promise<Hub> {
    const hub = await this.resolveHub(hubIdOrCode);
    const requireActive = options.requireActive ?? true;

    if (requireActive && hub.status !== HubStatus.ACTIVE) {
      throw new ForbiddenException({
        message: `Hub ${hub.code} is ${hub.status} and cannot accept new operations`,
        error: "HUB_NOT_ACTIVE",
      });
    }

    // ADMIN is a deliberate bypass of hub scoping (docs/10-SECURITY.md).
    if (user.role === UserRole.ADMIN) {
      return hub;
    }

    if (!HUB_OPERATION_ROLES.includes(user.role)) {
      throw new ForbiddenException({
        message: "Hub operations require a hub operations role",
        error: "HUB_FORBIDDEN",
      });
    }

    const assignment = await this.assignmentRepo.findOne({
      where: { userId: user.id, hubId: hub.id, isActive: true },
    });

    if (!assignment) {
      throw new ForbiddenException({
        message: `Access denied: you are not assigned to hub ${hub.code}`,
        error: "HUB_FORBIDDEN",
      });
    }

    if (!hasEffectivePermission(user.role, assignment.permissions, permission)) {
      throw new ForbiddenException({
        message: `Access denied: missing permission ${permission} on hub ${hub.code}`,
        error: "HUB_PERMISSION_DENIED",
      });
    }

    return hub;
  }

  /** Resolves a hub by UUID or by human-readable code. */
  async resolveHub(hubIdOrCode: string): Promise<Hub> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      hubIdOrCode,
    );

    const hub = await this.hubRepo.findOne({
      where: isUuid ? { id: hubIdOrCode } : { code: hubIdOrCode.toUpperCase() },
    });

    if (!hub) {
      throw new NotFoundException({
        message: `Hub not found: ${hubIdOrCode}`,
        error: "HUB_NOT_FOUND",
      });
    }

    return hub;
  }

  /** Non-throwing variant used to scope reads to hubs the actor may see. */
  async isHubVisible(user: AuthenticatedUser, hubId: string): Promise<boolean> {
    if (user.role === UserRole.ADMIN) return true;
    const assignment = await this.assignmentRepo.findOne({
      where: { userId: user.id, hubId, isActive: true },
      select: ["id"],
    });
    return assignment !== null;
  }

  /** Asserts the actor may act on `hub` without requiring a specific permission. */
  async assertHubVisible(user: AuthenticatedUser, hub: Hub): Promise<void> {
    if (user.role === UserRole.ADMIN) return;
    const assignment = await this.assignmentRepo.findOne({
      where: { userId: user.id, hubId: hub.id, isActive: true },
    });
    if (!assignment) {
      throw new ForbiddenException({
        message: `Access denied: you are not assigned to hub ${hub.code}`,
        error: "HUB_FORBIDDEN",
      });
    }
  }
}
