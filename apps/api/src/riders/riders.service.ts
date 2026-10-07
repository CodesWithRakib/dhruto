import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
  Optional,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomInt } from "node:crypto";
import {
  Repository,
  In,
  DataSource,
  EntityManager,
  MoreThanOrEqual,
  type FindOptionsWhere,
} from "typeorm";
import {
  Parcel,
  ParcelStatus,
  ParcelStatusHistory,
  CashLedger,
  CashHandInStatus,
  Rider,
  RiderStatus,
  OPERABLE_RIDER_STATUSES,
  DeliveryAttempt,
  ParcelAssignment,
  HubUserAssignment,
  Hub,
  User,
  CashHandIn,
  CashHandInItem,
} from "../database/entities/index.js";
import { CashHandInStatus as BatchHandInStatus } from "@dhruto/contracts";
import {
  ApiErrorCode,
  DeliveryAttemptOutcome,
  DomainEventType,
  FinancialTransactionType,
  EntryDirection,
  FinancialAccount,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_REQUESTS,
  OTP_REQUEST_COOLDOWN_SECONDS,
  OTP_TTL_SECONDS,
  RiderDutyStatus,
  type CompleteDeliveryDto,
  type CompleteDeliveryResult,
  type FailDeliveryDto,
  type FailDeliveryResult,
  type CashHandInDto,
  type RequestOtpResult,
  type RiderDashboard,
  type RiderHistoryItem,
  type RiderListItem,
  type RiderDetails,
  type RiderProfile,
  type StartDeliveryResult,
  type VerifyOtpResult,
} from "@dhruto/contracts";
import { ParcelLifecycleService } from "../parcels/lifecycle/parcel-lifecycle.service.js";
import { PasswordService } from "../auth/services/password.service.js";
import {
  IdempotencyClaimConflict,
  IdempotencyService,
} from "../common/idempotency/idempotency.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { LedgerService } from "../finance/ledger/ledger.service.js";
import { OutboxService } from "../integrations/outbox.service.js";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import { UserRole } from "../database/entities/index.js";

/** Parcel states that count as an open delivery task for a rider. */
const ACTIVE_TASK_STATUSES: readonly ParcelStatus[] = [
  ParcelStatus.ASSIGNED_TO_RIDER,
  ParcelStatus.OUT_FOR_DELIVERY,
  ParcelStatus.DELIVERY_ATTEMPTED,
  ParcelStatus.RESCHEDULED,
];

/** Parcel states that close a delivery task. */
const CLOSED_TASK_STATUSES: readonly ParcelStatus[] = [
  ParcelStatus.DELIVERED,
  ParcelStatus.CASH_PENDING,
  ParcelStatus.CASH_VERIFIED,
];

/** History states shown on the rider history screen. */
const HISTORY_STATUSES: readonly ParcelStatus[] = [
  ...CLOSED_TASK_STATUSES,
  ParcelStatus.DELIVERY_ATTEMPTED,
  ParcelStatus.RESCHEDULED,
];

/** Reschedule window: at most 7 days into the future. */
const RESCHEDULE_MAX_DAYS = 7;

const toMinor = (amount: number): number => Math.round(Number(amount) * 100);

@Injectable()
export class RidersService {
  private readonly logger = new Logger(RidersService.name);

  constructor(
    @InjectRepository(Parcel)
    private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(CashLedger)
    private readonly cashLedgerRepo: Repository<CashLedger>,
    @InjectRepository(Rider)
    private readonly riderRepo: Repository<Rider>,
    @InjectRepository(DeliveryAttempt)
    private readonly attemptRepo: Repository<DeliveryAttempt>,
    @InjectRepository(ParcelAssignment)
    private readonly assignmentRepo: Repository<ParcelAssignment>,
    @InjectRepository(HubUserAssignment)
    private readonly hubAssignmentRepo: Repository<HubUserAssignment>,
    @InjectRepository(Hub)
    private readonly hubRepo: Repository<Hub>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CashHandIn)
    private readonly handInRepo: Repository<CashHandIn>,
    @InjectRepository(CashHandInItem)
    private readonly handInItemRepo: Repository<CashHandInItem>,
    private readonly dataSource: DataSource,
    private readonly lifecycle: ParcelLifecycleService,
    private readonly passwordService: PasswordService,
    private readonly idempotency: IdempotencyService,
    private readonly ledger: LedgerService,
    private readonly outbox: OutboxService,
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  /* ================================================================== */
  /* Rider identity                                                     */
  /* ================================================================== */

  /**
   * Helper to ensure rider profile exists for the user.
   */
  async getRiderByUserId(userId: string): Promise<Rider> {
    const rider = await this.riderRepo.findOne({
      where: { userId },
      relations: ["hub"],
    });
    if (!rider) {
      throw new NotFoundException({
        message: "Rider profile not found for this user",
        error: ApiErrorCode.RIDER_NOT_FOUND,
      });
    }
    return rider;
  }

  /**
   * Loads the rider and rejects inactive/off-duty riders from every
   * operational command. Frontend duty toggles are UX only.
   */
  private async assertOperableRider(riderId: string): Promise<Rider> {
    const rider = await this.riderRepo.findOne({
      where: { id: riderId },
      relations: ["hub"],
    });
    if (!rider) {
      throw new NotFoundException({
        message: "Rider profile not found",
        error: ApiErrorCode.RIDER_NOT_FOUND,
      });
    }
    if (!OPERABLE_RIDER_STATUSES.includes(rider.status)) {
      throw new ForbiddenException({
        message: `Rider is ${rider.status} and cannot perform delivery operations`,
        error: ApiErrorCode.RIDER_INACTIVE,
      });
    }
    return rider;
  }

  /* ================================================================== */
  /* Tasks, dashboard, history, profile                                 */
  /* ================================================================== */

  /**
   * Parcels currently assigned to the rider. Never exposes the OTP secret or
   * merchant internals — the rider learns the OTP from the customer only.
   */
  async getAssignedTasks(riderId: string, filterStatus?: ParcelStatus) {
    await this.assertOperableRider(riderId);

    const parcels = await this.parcelRepo.find({
      where: {
        currentRiderId: riderId,
        status: filterStatus ?? In([...ACTIVE_TASK_STATUSES]),
      },
      order: { updatedAt: "DESC" },
      take: 200,
    });

    const attemptCounts = await this.countAttempts(
      parcels.map((parcel) => parcel.id),
    );

    return parcels.map((parcel) => ({
      id: parcel.id,
      trackingCode: parcel.trackingCode,
      status: parcel.status,
      recipientName: parcel.recipientName,
      recipientPhone: parcel.recipientPhone,
      deliveryAddress: parcel.rawAddress,
      district: parcel.district ?? undefined,
      thana: parcel.thana ?? undefined,
      weight: Number(parcel.weight),
      codAmount: Number(parcel.codAmount),
      attemptCount: attemptCounts.get(parcel.id) ?? 0,
      otpVerified: parcel.otpVerifiedAt !== null,
      otpExpiresAt: parcel.otpExpiresAt?.toISOString() ?? null,
      createdAt: parcel.createdAt,
      updatedAt: parcel.updatedAt,
    }));
  }

  /** Task details with the full attempt trail for the handoff screen. */
  async getTaskDetails(riderId: string, parcelId: string) {
    await this.assertOperableRider(riderId);
    const parcel = await this.loadOwnedParcel(riderId, parcelId);
    const hub = parcel.currentHubId
      ? await this.hubRepo.findOne({
          where: { id: parcel.currentHubId },
          select: ["id", "code", "name"],
        })
      : null;
    const attempts = await this.attemptRepo.find({
      where: { parcelId: parcel.id },
      order: { attemptNumber: "ASC" },
    });

    return {
      id: parcel.id,
      trackingCode: parcel.trackingCode,
      status: parcel.status,
      recipientName: parcel.recipientName,
      recipientPhone: parcel.recipientPhone,
      deliveryAddress: parcel.rawAddress,
      district: parcel.district ?? undefined,
      thana: parcel.thana ?? undefined,
      weight: Number(parcel.weight),
      codAmount: Number(parcel.codAmount),
      deliveryFee: Number(parcel.deliveryFee),
      currentHubCode: hub?.code ?? null,
      currentHubName: hub?.name ?? null,
      attemptCount: attempts.length,
      otpVerified: parcel.otpVerifiedAt !== null,
      otpExpiresAt: parcel.otpExpiresAt?.toISOString() ?? null,
      createdAt: parcel.createdAt,
      updatedAt: parcel.updatedAt,
      attempts: attempts.map((attempt) => ({
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        outcome: attempt.outcome,
        failureReason: attempt.failureReason,
        notes: attempt.notes,
        rescheduledFor: attempt.rescheduledFor?.toISOString() ?? null,
        codCollected:
          typeof attempt.metadata?.codCollected === "number"
            ? attempt.metadata.codCollected
            : null,
        createdAt: attempt.createdAt.toISOString(),
      })),
    };
  }

  /** Operational dashboard aggregates — real counts, no placeholders. */
  async getDashboard(riderId: string): Promise<RiderDashboard> {
    const rider = await this.assertOperableRider(riderId);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [assigned, inProgress, deliveredToday, failedToday, outForDelivery] =
      await Promise.all([
        this.parcelRepo.count({
          where: { currentRiderId: riderId, status: ParcelStatus.ASSIGNED_TO_RIDER },
        }),
        this.parcelRepo.count({
          where: { currentRiderId: riderId, status: ParcelStatus.OUT_FOR_DELIVERY },
        }),
        this.parcelRepo.count({
          where: {
            currentRiderId: riderId,
            status: In([...CLOSED_TASK_STATUSES]),
            updatedAt: MoreThanOrEqual(startOfToday),
          },
        }),
        this.parcelRepo.count({
          where: {
            currentRiderId: riderId,
            status: In([ParcelStatus.DELIVERY_ATTEMPTED, ParcelStatus.RESCHEDULED]),
            updatedAt: MoreThanOrEqual(startOfToday),
          },
        }),
        this.parcelRepo.find({
          where: { currentRiderId: riderId, status: ParcelStatus.OUT_FOR_DELIVERY },
          select: ["id", "codAmount"],
        }),
      ]);

    const codToCollect = outForDelivery.reduce(
      (total, parcel) => total + Number(parcel.codAmount),
      0,
    );

    return {
      riderCode: rider.riderCode ?? "",
      riderName: "",
      hubCode: rider.hub?.code ?? "",
      hubName: rider.hub?.name ?? "",
      duty: this.toDuty(rider.status),
      counts: { assigned, inProgress, deliveredToday, failedToday },
      codToCollect,
      parcelsInHand: assigned + inProgress,
    };
  }

  /** Closed + failed tasks, newest first, paginated. */
  async getHistory(
    riderId: string,
    options: { page?: number; limit?: number; status?: ParcelStatus } = {},
  ): Promise<{ items: RiderHistoryItem[]; total: number; page: number; limit: number }> {
    await this.assertOperableRider(riderId);
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));

    const where: FindOptionsWhere<Parcel> = {
      currentRiderId: riderId,
      status: options.status ?? In([...HISTORY_STATUSES]),
    };
    const [parcels, total] = await this.parcelRepo.findAndCount({
      where,
      order: { updatedAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });

    const parcelIds = parcels.map((parcel) => parcel.id);
    const [attemptCounts, deliveredAttempts] = await Promise.all([
      this.countAttempts(parcelIds),
      parcelIds.length
        ? this.attemptRepo.find({
            where: { parcelId: In(parcelIds), outcome: DeliveryAttemptOutcome.DELIVERED },
          })
        : Promise.resolve([]),
    ]);
    const codByParcel = new Map<string, number>();
    for (const attempt of deliveredAttempts) {
      const collected = attempt.metadata?.codCollected;
      if (typeof collected === "number") codByParcel.set(attempt.parcelId, collected);
    }

    return {
      items: parcels.map((parcel) => ({
        id: parcel.id,
        trackingCode: parcel.trackingCode,
        status: parcel.status,
        recipientName: parcel.recipientName,
        district: parcel.district,
        codCollected: codByParcel.get(parcel.id) ?? null,
        attemptCount: attemptCounts.get(parcel.id) ?? 0,
        updatedAt: parcel.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  /** Rider profile for the terminal: code, hub, duty, joined date. */
  async getProfile(riderId: string, user: AuthenticatedUser): Promise<RiderProfile> {
    const rider = await this.assertOperableRider(riderId);
    const account = await this.userRepo.findOne({
      where: { id: rider.userId },
      select: ["id", "name", "email", "phone"],
    });

    return {
      riderCode: rider.riderCode ?? "",
      name: account?.name ?? "",
      email: account?.email ?? user.email,
      phone: account?.phone ?? user.phone,
      hubCode: rider.hub?.code ?? "",
      hubName: rider.hub?.name ?? "",
      status: rider.status,
      duty: this.toDuty(rider.status),
      joinedAt: rider.joinedAt.toISOString(),
    };
  }

  /**
   * Shift toggle. Going OFF_DUTY with parcels still out for delivery is
   * rejected so work is never abandoned silently.
   */
  async setDuty(riderId: string, duty: RiderDutyStatus): Promise<RiderProfile> {
    const rider = await this.riderRepo.findOne({ where: { id: riderId } });
    if (!rider) {
      throw new NotFoundException({
        message: "Rider profile not found",
        error: ApiErrorCode.RIDER_NOT_FOUND,
      });
    }
    if (rider.status === RiderStatus.INACTIVE) {
      throw new ForbiddenException({
        message: "Inactive riders cannot change duty status",
        error: ApiErrorCode.RIDER_INACTIVE,
      });
    }
    if (duty === RiderDutyStatus.OFF_DUTY) {
      const open = await this.parcelRepo.count({
        where: { currentRiderId: riderId, status: ParcelStatus.OUT_FOR_DELIVERY },
      });
      if (open > 0) {
        throw new ConflictException({
          message: `Cannot go off duty with ${open} parcel(s) still out for delivery`,
          error: ApiErrorCode.DUTY_CONFLICT,
        });
      }
      rider.status = RiderStatus.OFF_DUTY;
    } else {
      rider.status = RiderStatus.ON_DUTY;
    }
    await this.riderRepo.save(rider);
    const account = await this.userRepo.findOne({
      where: { id: rider.userId },
      select: ["id", "name", "email", "phone"],
    });
    const hub = await this.hubRepo.findOne({
      where: { id: rider.hubId },
      select: ["id", "code", "name"],
    });
    return {
      riderCode: rider.riderCode ?? "",
      name: account?.name ?? "",
      email: account?.email ?? "",
      phone: account?.phone ?? "",
      hubCode: hub?.code ?? "",
      hubName: hub?.name ?? "",
      status: rider.status,
      duty: this.toDuty(rider.status),
      joinedAt: rider.joinedAt.toISOString(),
    };
  }

  /* ================================================================== */
  /* Start + OTP                                                        */
  /* ================================================================== */

  /**
   * Rider starts out-for-delivery run on an assigned parcel.
   */
  async startDelivery(
    riderId: string,
    parcelId: string,
    userId: string,
  ): Promise<StartDeliveryResult & { otp?: string }> {
    return this.dataSource.transaction(async (manager) => {
      await this.assertOperableRider(riderId);
      const parcel = await this.lockOwnedParcel(manager, riderId, parcelId);

      const fromStatus = parcel.status;
      this.lifecycle.assertTransition(fromStatus, ParcelStatus.OUT_FOR_DELIVERY);
      parcel.status = ParcelStatus.OUT_FOR_DELIVERY;

      // Fresh leg, fresh secret — unless a live OTP already exists (restart).
      let otp: string | null = null;
      if (!parcel.deliveryOtpHash || this.isOtpExpired(parcel)) {
        otp = await this.issueOtp(manager, parcel);
      }

      await manager.getRepository(Parcel).save(parcel);
      await this.appendHistory(manager, {
        parcelId: parcel.id,
        fromStatus,
        toStatus: ParcelStatus.OUT_FOR_DELIVERY,
        actorId: userId,
        actorRole: "RIDER",
        description: "Rider departed for delivery",
        metadata: { riderId },
      });

      this.logger.log(
        `Parcel ${parcel.trackingCode} is OUT_FOR_DELIVERY by rider ${riderId}`,
      );

      // Transactional fan-out trigger: notifications + webhooks relay
      // asynchronously; the OTP SMS below stays synchronous (handoff path).
      // recipientPhone is included so the outbox relay can resolve the
      // customer SMS target — the OTP secret itself NEVER goes in the event.
      await this.outbox.append(manager, {
        eventType: DomainEventType.PARCEL_OUT_FOR_DELIVERY,
        aggregateType: "parcel",
        aggregateId: parcel.id,
        actorId: userId,
        payload: {
          parcelId: parcel.id,
          trackingCode: parcel.trackingCode,
          merchantId: parcel.merchantId,
          riderId,
          recipientPhone: parcel.recipientPhone,
          recipientName: parcel.recipientName,
        },
      });

      const expiresAt = parcel.otpExpiresAt?.toISOString() ?? new Date().toISOString();
      // Side effects after the state change; failures only warn.
      await this.dispatchOutForDelivery(parcel, riderId, otp);

      return {
        parcelId: parcel.id,
        trackingCode: parcel.trackingCode,
        status: parcel.status,
        otpSent: otp !== null || parcel.deliveryOtpHash !== null,
        otpExpiresAt: expiresAt,
        message: "Delivery started. Parcel is now OUT_FOR_DELIVERY.",
        // Automation support (dev/test only): the secret is NEVER included
        // when NODE_ENV=production. The rider UI never renders this field.
        ...(process.env.NODE_ENV !== "production" && otp ? { otp } : {}),
      };
    });
  }

  /**
   * (Re)sends the customer OTP. Cooldown + per-leg cap protect the SMS
   * channel; the secret itself is never returned outside test automation.
   */
  async requestOtp(riderId: string, parcelId: string): Promise<RequestOtpResult> {
    return this.dataSource.transaction(async (manager) => {
      await this.assertOperableRider(riderId);
      const parcel = await this.lockOwnedParcel(manager, riderId, parcelId);

      if (parcel.status !== ParcelStatus.OUT_FOR_DELIVERY) {
        if ([...CLOSED_TASK_STATUSES].includes(parcel.status)) {
          throw new ConflictException({
            message: `Parcel is already ${parcel.status}; no OTP can be issued`,
            error: ApiErrorCode.DELIVERY_ALREADY_COMPLETED,
          });
        }
        throw new BadRequestException({
          message: `Delivery has not started (status ${parcel.status})`,
          error: ApiErrorCode.DELIVERY_NOT_STARTED,
        });
      }

      const now = new Date();
      if (
        parcel.lastOtpRequestedAt &&
        now.getTime() - parcel.lastOtpRequestedAt.getTime() <
          OTP_REQUEST_COOLDOWN_SECONDS * 1000
      ) {
        throw new HttpException(
          {
            message: `Wait ${OTP_REQUEST_COOLDOWN_SECONDS}s between OTP requests`,
            error: ApiErrorCode.OTP_COOLDOWN,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (parcel.otpRequestCount >= OTP_MAX_REQUESTS) {
        throw new HttpException(
          {
            message: "Maximum OTP requests reached for this delivery",
            error: ApiErrorCode.OTP_LIMIT_REACHED,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      const otp = await this.issueOtp(manager, parcel);
      await manager.getRepository(Parcel).save(parcel);
      await this.appendHistory(manager, {
        parcelId: parcel.id,
        fromStatus: parcel.status,
        toStatus: parcel.status,
        eventType: "OTP_REQUESTED",
        actorId: riderId,
        actorRole: "RIDER",
        description: `Delivery OTP re-issued (request ${parcel.otpRequestCount})`,
        metadata: { riderId },
      });

      if (this.notificationsService) {
        await this.notificationsService
          .sendDeliveryOtpSms(parcel.recipientPhone, parcel.trackingCode, otp)
          .catch((err) =>
            this.logger.warn(`Failed to dispatch OTP notification: ${err.message}`),
          );
      }

      return {
        parcelId: parcel.id,
        trackingCode: parcel.trackingCode,
        otpSent: true,
        otpExpiresAt: parcel.otpExpiresAt?.toISOString() ?? now.toISOString(),
        attemptsRemaining: OTP_MAX_ATTEMPTS - parcel.otpAttempts,
        // Automation support (dev/test only) — see startDelivery.
        ...(process.env.NODE_ENV !== "production" ? { otp } : {}),
      };
    });
  }

  /**
   * Verify delivery OTP submitted by customer to rider.
   *
   * The verification outcome (including wrong-guess increments) commits in
   * its own transaction BEFORE any HTTP error is raised: otherwise the
   * rollback would erase the attempt counter and allow unlimited guessing.
   */
  async verifyOtp(riderId: string, parcelId: string, otp: string): Promise<VerifyOtpResult> {
    const outcome = await this.dataSource.transaction(async (manager) => {
      await this.assertOperableRider(riderId);
      const parcel = await this.lockOwnedParcel(manager, riderId, parcelId);
      return this.attemptOtpVerification(manager, parcel, otp.trim(), riderId);
    });

    switch (outcome.kind) {
      case "verified":
      case "already":
        return {
          valid: true,
          message:
            outcome.kind === "already"
              ? "OTP already verified for this delivery"
              : "OTP verified successfully",
          attemptsRemaining: outcome.attemptsRemaining,
          verifiedAt: outcome.verifiedAt,
        };
      case "invalid":
        throw new BadRequestException({
          message: "Invalid OTP code",
          error: ApiErrorCode.OTP_INVALID,
        });
      case "expired":
        throw new BadRequestException({
          message: "OTP has expired. Request a new OTP.",
          error: ApiErrorCode.OTP_EXPIRED,
        });
      case "locked":
        throw new HttpException(
          {
            message: "Too many wrong attempts. Request a new OTP.",
            error: ApiErrorCode.OTP_LOCKED,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      case "missing":
        throw new HttpException(
          {
            message: "No active OTP for this parcel. Request a new OTP first.",
            error: ApiErrorCode.OTP_REQUIRED,
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
    }
  }

  /* ================================================================== */
  /* Complete (idempotent)                                              */
  /* ================================================================== */

  /**
   * Mark parcel as completed/delivered, records cash ledger if COD exists.
   *
   * Atomic: OTP state, attempt row, both status transitions, ledger and
   * history commit together. With an `Idempotency-Key` the response is
   * replayed instead of duplicated; without one, a completed parcel replays
   * its own delivery record.
   */
  async completeDelivery(
    riderId: string,
    parcelId: string,
    dto: CompleteDeliveryDto,
    userId: string,
    idempotencyKey?: string,
  ): Promise<CompleteDeliveryResult> {
    const scope = `rider-complete:${riderId}`;
    const requestHash = idempotencyKey
      ? IdempotencyService.fingerprint({ parcelId, ...dto })
      : "";

    if (idempotencyKey) {
      const resolution = await this.idempotency.resolve(idempotencyKey, scope, requestHash);
      if (resolution.kind === "replay") {
        this.idempotency.logReplay(scope, idempotencyKey);
        return resolution.response as unknown as CompleteDeliveryResult;
      }
      if (resolution.kind === "conflict") {
        this.idempotency.logConflict(scope, idempotencyKey);
        throw new ConflictException({
          message: "Idempotency key was already used with a different payload",
          error: IdempotencyService.CONFLICT_CODE,
        });
      }
    }

    // OTP verification commits in its own transaction first, so a wrong guess
    // submitted with the completion still consumes the attempt budget instead
    // of being rolled back with the aborted completion.
    const precondition = await this.parcelRepo.findOne({
      where: { id: parcelId },
      select: ["id", "currentRiderId", "status", "otpVerifiedAt"],
    });
    if (!precondition) {
      throw new NotFoundException({
        message: "Parcel not found",
        error: ApiErrorCode.PARCEL_NOT_FOUND,
      });
    }
    if (precondition.currentRiderId !== riderId) {
      throw new ForbiddenException({
        message: "This parcel is not assigned to you",
        error: ApiErrorCode.FORBIDDEN,
      });
    }
    if (!precondition.otpVerifiedAt) {
      if (!dto.otp) {
        throw new HttpException(
          {
            message: "Customer OTP verification is required before completion",
            error: ApiErrorCode.OTP_REQUIRED,
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      await this.verifyOtp(riderId, parcelId, dto.otp);
    }

    return this.dataSource.transaction(async (manager) => {
        await this.assertOperableRider(riderId);
        const parcel = await this.lockOwnedParcel(manager, riderId, parcelId);

        // Duplicate completion replays the recorded delivery, never duplicates it.
        if ([...CLOSED_TASK_STATUSES].includes(parcel.status)) {
          const replay = await this.replayCompletedDelivery(manager, parcel);
          if (replay) {
            if (idempotencyKey) {
              await this.idempotency.complete(manager, {
                key: idempotencyKey,
                scope,
                statusCode: HttpStatus.OK,
                response: replay as unknown as Record<string, unknown>,
                userId,
              });
            }
            return replay;
          }
          throw new ConflictException({
            message: `Parcel is already ${parcel.status}`,
            error: ApiErrorCode.DELIVERY_ALREADY_COMPLETED,
          });
        }

        if (parcel.status !== ParcelStatus.OUT_FOR_DELIVERY) {
          throw new BadRequestException({
            message: `Parcel must be in OUT_FOR_DELIVERY status to be completed. Current status: ${parcel.status}`,
            error: ApiErrorCode.DELIVERY_NOT_STARTED,
          });
        }

        if (idempotencyKey) {
          try {
            await this.idempotency.claim(manager, {
              key: idempotencyKey,
              scope,
              userId,
              requestHash,
            });
          } catch (error) {
            if (error instanceof IdempotencyClaimConflict) {
              const resolution = await this.idempotency.resolve(
                idempotencyKey,
                scope,
                requestHash,
                { attempts: 5, delayMs: 300 },
              );
              if (resolution.kind === "replay") {
                return resolution.response as unknown as CompleteDeliveryResult;
              }
              throw new ConflictException({
                message: "Delivery completion is already in progress for this key",
                error: IdempotencyService.IN_PROGRESS_CODE,
              });
            }
            throw error;
          }
        }

        // OTP was verified (durably) before this transaction opened.
        const verifiedAt = parcel.otpVerifiedAt;
        if (!verifiedAt) {
          throw new HttpException(
            {
              message: "Customer OTP verification is required before completion",
              error: ApiErrorCode.OTP_REQUIRED,
            },
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        }

        // COD must match exactly — the frontend amount is never trusted.
        const expectedMinor = toMinor(Number(parcel.codAmount));
        const collectedMinor =
          dto.codAmountCollected !== undefined
            ? toMinor(Number(dto.codAmountCollected))
            : expectedMinor;
        if (collectedMinor !== expectedMinor) {
          throw new HttpException(
            {
              message: `Collected amount ৳${(collectedMinor / 100).toLocaleString()} does not match COD due ৳${(expectedMinor / 100).toLocaleString()}`,
              error: ApiErrorCode.COD_MISMATCH,
            },
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        }
        const collectedAmount = collectedMinor / 100;

        this.lifecycle.assertTransition(parcel.status, ParcelStatus.DELIVERED);
        parcel.status = ParcelStatus.DELIVERED;

        const attemptNumber = (await manager.count(DeliveryAttempt, {
          where: { parcelId: parcel.id },
        })) + 1;
        const attempt = await manager.getRepository(DeliveryAttempt).save(
          manager.getRepository(DeliveryAttempt).create({
            parcelId: parcel.id,
            riderId,
            attemptNumber,
            outcome: DeliveryAttemptOutcome.DELIVERED,
            failureReason: null,
            notes: dto.remarks?.trim() || null,
            rescheduledFor: null,
            metadata: {
              codCollected: collectedAmount,
              proofPhotoUrl: dto.proofPhotoUrl ?? null,
              otpVerifiedAt: verifiedAt.toISOString(),
            },
          }),
        );

        await this.appendHistory(manager, {
          parcelId: parcel.id,
          fromStatus: ParcelStatus.OUT_FOR_DELIVERY,
          toStatus: ParcelStatus.DELIVERED,
          actorId: userId,
          actorRole: "RIDER",
          description: dto.remarks?.trim() || "Delivered to recipient",
          metadata: {
            riderId,
            attemptId: attempt.id,
            attemptNumber,
            codCollected: collectedAmount,
            proofPhotoUrl: dto.proofPhotoUrl ?? null,
            otpVerifiedAt: verifiedAt.toISOString(),
          },
        });

        // COD leg: DELIVERED -> CASH_PENDING + operational cash liability.
        // Merchant settlement stays in Phase 4 — this only records the cash.
        let cashLedgerId: string | null = null;
        if (collectedMinor > 0) {
          this.lifecycle.assertTransition(ParcelStatus.DELIVERED, ParcelStatus.CASH_PENDING);
          parcel.status = ParcelStatus.CASH_PENDING;
          await this.appendHistory(manager, {
            parcelId: parcel.id,
            fromStatus: ParcelStatus.DELIVERED,
            toStatus: ParcelStatus.CASH_PENDING,
            actorId: userId,
            actorRole: "RIDER",
            description: `COD ৳${collectedAmount.toLocaleString()} collected; awaiting hub handover`,
            metadata: { riderId, attemptId: attempt.id },
          });

          const existing = await manager.getRepository(CashLedger).findOne({
            where: { parcelId: parcel.id },
          });
          if (existing) {
            throw new ConflictException({
              message: "Cash collection was already recorded for this parcel",
              error: ApiErrorCode.DELIVERY_ALREADY_COMPLETED,
            });
          }
          const rider = await manager.getRepository(Rider).findOne({
            where: { id: riderId },
          });
          const cashLedger = await manager.getRepository(CashLedger).save(
            manager.getRepository(CashLedger).create({
              parcelId: parcel.id,
              riderId,
              hubId: rider?.hubId ?? null,
              amount: collectedAmount,
              collectedAt: new Date(),
              handInStatus: CashHandInStatus.PENDING,
            }),
          );
          cashLedgerId = cashLedger.id;

          // Rider custody liability through the journal: the rider now owes
          // the platform the collected cash until hand-in.
          await this.ledger.post(manager, {
            type: FinancialTransactionType.COD_COLLECTED,
            referenceType: "CASH_LEDGER",
            referenceId: cashLedger.id,
            description: `COD collected for parcel ${parcel.trackingCode}`,
            entries: [
              {
                account: FinancialAccount.RIDER_CASH_IN_HAND,
                direction: EntryDirection.DEBIT,
                amountMinor: toMinor(collectedAmount),
              },
              {
                account: FinancialAccount.COD_RECEIVABLE,
                direction: EntryDirection.CREDIT,
                amountMinor: toMinor(collectedAmount),
              },
            ],
            createdBy: userId,
          });

          this.logger.log(
            `COD Collected: ৳${collectedAmount} for Parcel ${parcel.trackingCode}. Recorded in CashLedger.`,
          );
        }

        await manager.getRepository(Parcel).save(parcel);

        const result: CompleteDeliveryResult = {
          parcelId: parcel.id,
          trackingCode: parcel.trackingCode,
          status: parcel.status,
          attemptId: attempt.id,
          attemptNumber,
          codAmountCollected: collectedAmount,
          cashLedgerId,
          proof: {
            type: "OTP",
            verifiedAt: verifiedAt.toISOString(),
            photoUrl: dto.proofPhotoUrl ?? null,
          },
          message: "Parcel marked as delivered successfully.",
        };

        await this.outbox.append(manager, {
          eventType: DomainEventType.PARCEL_DELIVERED,
          aggregateType: "parcel",
          aggregateId: parcel.id,
          actorId: userId,
          payload: {
            parcelId: parcel.id,
            trackingCode: parcel.trackingCode,
            merchantId: parcel.merchantId,
            riderId,
            codCollected: collectedAmount,
            attemptId: attempt.id,
            recipientPhone: parcel.recipientPhone,
            recipientName: parcel.recipientName,
          },
        });

        if (idempotencyKey) {
          await this.idempotency.complete(manager, {
            key: idempotencyKey,
            scope,
            statusCode: HttpStatus.OK,
            response: result as unknown as Record<string, unknown>,
            userId,
          });
        }

        // Side effects after commit; failures only warn.
        await this.dispatchDeliveryComplete(parcel, collectedAmount);

        return result;
      });
  }

  /* ================================================================== */
  /* Failed delivery                                                    */
  /* ================================================================== */

  /**
   * Mark parcel delivery as failed/attempted.
   */
  async failDelivery(
    riderId: string,
    parcelId: string,
    dto: FailDeliveryDto,
    userId: string,
  ): Promise<FailDeliveryResult> {
    return this.dataSource.transaction(async (manager) => {
      await this.assertOperableRider(riderId);
      const parcel = await this.lockOwnedParcel(manager, riderId, parcelId);

      if (parcel.status !== ParcelStatus.OUT_FOR_DELIVERY) {
        throw new BadRequestException({
          message: `Parcel must be in OUT_FOR_DELIVERY to mark as failed. Current status: ${parcel.status}`,
          error: ApiErrorCode.DELIVERY_NOT_STARTED,
        });
      }

      let rescheduledFor: Date | null = null;
      if (dto.rescheduledDate) {
        rescheduledFor = this.parseRescheduleDate(dto.rescheduledDate);
      }

      const attemptNumber = (await manager.count(DeliveryAttempt, {
        where: { parcelId: parcel.id },
      })) + 1;
      const attempt = await manager.getRepository(DeliveryAttempt).save(
        manager.getRepository(DeliveryAttempt).create({
          parcelId: parcel.id,
          riderId,
          attemptNumber,
          outcome: DeliveryAttemptOutcome.FAILED,
          failureReason: dto.reason,
          notes: dto.notes?.trim() || null,
          rescheduledFor,
          metadata: { riderId },
        }),
      );

      this.lifecycle.assertTransition(parcel.status, ParcelStatus.DELIVERY_ATTEMPTED);
      parcel.status = ParcelStatus.DELIVERY_ATTEMPTED;
      await this.appendHistory(manager, {
        parcelId: parcel.id,
        fromStatus: ParcelStatus.OUT_FOR_DELIVERY,
        toStatus: ParcelStatus.DELIVERY_ATTEMPTED,
        actorId: userId,
        actorRole: "RIDER",
        description: `Delivery failed: ${dto.reason}. ${dto.notes?.trim() || ""}`.trim(),
        metadata: {
          riderId,
          attemptId: attempt.id,
          attemptNumber,
          reason: dto.reason,
          rescheduledFor: rescheduledFor?.toISOString() ?? null,
          notes: dto.notes?.trim() || null,
        },
      });

      if (rescheduledFor) {
        this.lifecycle.assertTransition(parcel.status, ParcelStatus.RESCHEDULED);
        parcel.status = ParcelStatus.RESCHEDULED;
        await this.appendHistory(manager, {
          parcelId: parcel.id,
          fromStatus: ParcelStatus.DELIVERY_ATTEMPTED,
          toStatus: ParcelStatus.RESCHEDULED,
          actorId: userId,
          actorRole: "RIDER",
          description: `Rescheduled for ${rescheduledFor.toISOString()}`,
          metadata: {
            riderId,
            attemptId: attempt.id,
            rescheduledFor: rescheduledFor.toISOString(),
          },
        });
      }

      await manager.getRepository(Parcel).save(parcel);

      await this.outbox.append(manager, {
        eventType: DomainEventType.PARCEL_FAILED,
        aggregateType: "parcel",
        aggregateId: parcel.id,
        actorId: userId,
        payload: {
          parcelId: parcel.id,
          trackingCode: parcel.trackingCode,
          merchantId: parcel.merchantId,
          riderId,
          reason: dto.reason,
          attemptId: attempt.id,
          rescheduledFor: rescheduledFor?.toISOString() ?? null,
          recipientPhone: parcel.recipientPhone,
          recipientName: parcel.recipientName,
        },
      });

      return {
        parcelId: parcel.id,
        trackingCode: parcel.trackingCode,
        status: parcel.status,
        attemptId: attempt.id,
        attemptNumber,
        reason: dto.reason,
        rescheduledFor: rescheduledFor?.toISOString() ?? null,
        message: `Delivery attempt recorded as ${parcel.status}.`,
      };
    });
  }

  /* ================================================================== */
  /* Cash                                                               */
  /* ================================================================== */

  /**
   * Rider hands in collected cash to hub manager.
   *
   * Creates a persisted hand-in batch (server-computed expected total —
   * riders never declare amounts) and posts the custody transfer
   * RIDER_CASH_IN_HAND -> HUB_CASH through the journal. Idempotent per key:
   * repeats replay the recorded batch instead of moving cash twice.
   */
  async handInCash(
    riderId: string,
    userId: string,
    dto: CashHandInDto,
    idempotencyKey?: string,
  ): Promise<{
    handinId: string | null;
    handinCode: string | null;
    handedInCount: number;
    totalAmount: number;
    ledgerIds: string[];
    transactionId: string | null;
    message: string;
  }> {
    const rider = await this.assertOperableRider(riderId);
    const scope = `rider-handin:${riderId}`;

    if (idempotencyKey) {
      const requestHash = IdempotencyService.fingerprint({ riderId });
      const resolution = await this.idempotency.resolve(idempotencyKey, scope, requestHash);
      if (resolution.kind === "replay") {
        this.idempotency.logReplay(scope, idempotencyKey);
        return (resolution.response as unknown as Awaited<ReturnType<RidersService["handInCash"]>>);
      }
      if (resolution.kind === "conflict") {
        this.idempotency.logConflict(scope, idempotencyKey);
        throw new ConflictException({
          message: "Idempotency key was already used with a different payload",
          error: IdempotencyService.CONFLICT_CODE,
        });
      }
    }

    const result = await this.dataSource.transaction(async (manager) => {
      if (idempotencyKey) {
        try {
          await this.idempotency.claim(manager, {
            key: idempotencyKey,
            scope,
            userId,
            requestHash: IdempotencyService.fingerprint({ riderId }),
          });
        } catch (error) {
          if (error instanceof IdempotencyClaimConflict) {
            throw new ConflictException({
              message: "Cash hand-in is already in progress for this key",
              error: IdempotencyService.IN_PROGRESS_CODE,
            });
          }
          throw error;
        }
      }

      const pendingLedgers = await manager.getRepository(CashLedger).find({
        where: { riderId, handInStatus: CashHandInStatus.PENDING },
        lock: { mode: "pessimistic_write" },
      });

      if (pendingLedgers.length === 0) {
        return {
          handinId: null as string | null,
          handinCode: null as string | null,
          handedInCount: 0,
          totalAmount: 0,
          ledgerIds: [] as string[],
          transactionId: null as string | null,
          message: "No pending cash to hand in",
        };
      }

      const totalMinor = pendingLedgers.reduce(
        (sum, item) => sum + toMinor(item.amount),
        0,
      );

      const batch = await manager.getRepository(CashHandIn).save(
        manager.getRepository(CashHandIn).create({
          handinCode: await this.nextHandInCode(manager),
          riderId,
          hubId: rider.hubId ?? null,
          status: BatchHandInStatus.SUBMITTED,
          expectedMinor: totalMinor,
          verifiedMinor: 0,
          currency: "BDT",
          notes: dto.notes?.trim() || null,
        }),
      );

      await manager.getRepository(CashHandInItem).save(
        pendingLedgers.map((ledger) =>
          manager.getRepository(CashHandInItem).create({
            handInId: batch.id,
            cashLedgerId: ledger.id,
            amountMinor: toMinor(ledger.amount),
          }),
        ),
      );

      for (const ledger of pendingLedgers) {
        ledger.handInStatus = CashHandInStatus.HANDED_IN;
        await manager.getRepository(CashLedger).save(ledger);
      }

      const posting = await this.ledger.post(manager, {
        type: FinancialTransactionType.CASH_HANDED_IN,
        referenceType: "CASH_HANDIN",
        referenceId: batch.id,
        description: `Rider cash hand-in ${batch.handinCode} (${pendingLedgers.length} collections)`,
        entries: [
          { account: FinancialAccount.HUB_CASH, direction: EntryDirection.DEBIT, amountMinor: totalMinor },
          { account: FinancialAccount.RIDER_CASH_IN_HAND, direction: EntryDirection.CREDIT, amountMinor: totalMinor },
        ],
        createdBy: userId,
      });

      await this.outbox.append(manager, {
        eventType: DomainEventType.CASH_HAND_IN_SUBMITTED,
        aggregateType: "cash_handin",
        aggregateId: batch.id,
        actorId: userId,
        payload: {
          handinId: batch.id,
          handinCode: batch.handinCode,
          riderId,
          hubId: rider.hubId ?? null,
          itemCount: pendingLedgers.length,
          totalMinor,
        },
      });

      this.logger.log(
        `Rider ${riderId} handed in batch ${batch.handinCode} across ${pendingLedgers.length} parcels.`,
      );

      return {
        handinId: batch.id,
        handinCode: batch.handinCode,
        handedInCount: pendingLedgers.length,
        totalAmount: totalMinor / 100,
        ledgerIds: pendingLedgers.map((l) => l.id),
        transactionId: posting.id,
        message: `Successfully handed in batch ${batch.handinCode}. Awaiting Hub verification.`,
      };
    });

    if (idempotencyKey) {
      await this.dataSource.transaction(async (manager) => {
        await this.idempotency.complete(manager, {
          key: idempotencyKey,
          scope,
          statusCode: HttpStatus.OK,
          response: result as unknown as Record<string, unknown>,
          userId,
        });
      });
    }

    return result;
  }

  /** Hand-in batches submitted by the rider, newest first. */
  async getCashHandIns(riderId: string) {
    await this.assertOperableRider(riderId);
    const batches = await this.handInRepo.find({
      where: { riderId },
      order: { submittedAt: "DESC" },
      take: 100,
    });
    const hubIds = [...new Set(batches.map((b) => b.hubId).filter((id): id is string => id !== null))];
    const hubs = hubIds.length
      ? await this.hubRepo.find({ where: { id: In(hubIds) }, select: ["id", "code", "name"] })
      : [];
    const hubById = new Map(hubs.map((h) => [h.id, h]));
    const counts = new Map<string, number>();
    if (batches.length > 0) {
      const rows = await this.handInItemRepo
        .createQueryBuilder("item")
        .select("item.handInId", "handInId")
        .addSelect("COUNT(item.id)", "count")
        .where("item.handInId IN (:...ids)", { ids: batches.map((b) => b.id) })
        .groupBy("item.handInId")
        .getRawMany<{ handInId: string; count: string }>();
      for (const row of rows) counts.set(row.handInId, Number(row.count));
    }

    return batches.map((batch) => {
      const hub = batch.hubId ? hubById.get(batch.hubId) : undefined;
      return {
        id: batch.id,
        handinCode: batch.handinCode,
        riderId: batch.riderId,
        riderName: null,
        hubId: batch.hubId,
        hubCode: hub?.code ?? null,
        hubName: hub?.name ?? null,
        status: batch.status,
        expectedMinor: Number(batch.expectedMinor),
        verifiedMinor: Number(batch.verifiedMinor),
        itemCount: counts.get(batch.id) ?? 0,
        submittedAt: batch.submittedAt.toISOString(),
        verifiedAt: batch.verifiedAt?.toISOString() ?? null,
      };
    });
  }

  private async nextHandInCode(manager: EntityManager): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `CASH-${Math.floor(100000 + Math.random() * 900000)}`;
      const existing = await manager.findOne(CashHandIn, { where: { handinCode: code } });
      if (!existing) return code;
    }
    return `CASH-${Date.now().toString().slice(-6)}`;
  }

  /**
   * Summary of rider's COD collection and cash hand-in status.
   */
  async getCashSummary(riderId: string) {
    await this.assertOperableRider(riderId);
    const ledgers = await this.cashLedgerRepo.find({
      where: { riderId },
    });

    let pendingAmount = 0;
    let handedInAmount = 0;
    let verifiedAmount = 0;

    for (const item of ledgers) {
      const amt = Number(item.amount);
      if (item.handInStatus === CashHandInStatus.PENDING) {
        pendingAmount += amt;
      } else if (item.handInStatus === CashHandInStatus.HANDED_IN) {
        handedInAmount += amt;
      } else if (item.handInStatus === CashHandInStatus.VERIFIED) {
        verifiedAmount += amt;
      }
    }

    return {
      totalCollected: pendingAmount + handedInAmount + verifiedAmount,
      pendingHandIn: pendingAmount,
      awaitingVerification: handedInAmount,
      verifiedByHub: verifiedAmount,
      totalParcelsCount: ledgers.length,
    };
  }

  /* ================================================================== */
  /* Hub/admin rider operations                                         */
  /* ================================================================== */

  /**
   * Riders visible to the caller with live task counts. Hub managers only see
   * riders of hubs they hold an active assignment for.
   */
  async listRiders(
    actor: AuthenticatedUser,
    options: { hubId?: string } = {},
  ): Promise<RiderListItem[]> {
    const hubIds = await this.visibleRiderHubIds(actor, options.hubId);
    if (hubIds.length === 0) return [];

    const riders = await this.riderRepo.find({
      where: { hubId: In(hubIds) },
      relations: ["hub"],
      order: { createdAt: "ASC" },
      take: 200,
    });
    if (riders.length === 0) return [];

    const riderIds = riders.map((rider) => rider.id);
    const [activeTasks, deliveredToday] = await Promise.all([
      this.parcelRepo
        .createQueryBuilder("parcel")
        .select("parcel.currentRiderId", "riderId")
        .addSelect("COUNT(parcel.id)", "count")
        .where("parcel.currentRiderId IN (:...riderIds)", { riderIds })
        .andWhere("parcel.status IN (:...statuses)", { statuses: [...ACTIVE_TASK_STATUSES] })
        .groupBy("parcel.currentRiderId")
        .getRawMany<{ riderId: string; count: string }>(),
      this.parcelRepo
        .createQueryBuilder("parcel")
        .select("parcel.currentRiderId", "riderId")
        .addSelect("COUNT(parcel.id)", "count")
        .where("parcel.currentRiderId IN (:...riderIds)", { riderIds })
        .andWhere("parcel.status IN (:...statuses)", { statuses: [...CLOSED_TASK_STATUSES] })
        .andWhere("parcel.updatedAt >= :today", { today: startOfToday() })
        .groupBy("parcel.currentRiderId")
        .getRawMany<{ riderId: string; count: string }>(),
    ]);
    const activeByRider = new Map(activeTasks.map((row) => [row.riderId, Number(row.count)]));
    const deliveredByRider = new Map(
      deliveredToday.map((row) => [row.riderId, Number(row.count)]),
    );

    const userIds = [...new Set(riders.map((rider) => rider.userId))];
    const users = await this.dataSource.getRepository("users" as never).find({
      where: { id: In(userIds) },
    });
    const userById = new Map(
      (users as unknown as Array<{ id: string; name: string; phone: string }>).map((u) => [
        u.id,
        u,
      ]),
    );

    return riders.map((rider) => ({
      id: rider.id,
      riderCode: rider.riderCode ?? "",
      name: userById.get(rider.userId)?.name ?? "",
      phone: userById.get(rider.userId)?.phone ?? "",
      hubCode: rider.hub?.code ?? "",
      hubName: rider.hub?.name ?? "",
      status: rider.status,
      duty: this.toDuty(rider.status),
      activeTaskCount: activeByRider.get(rider.id) ?? 0,
      deliveredTodayCount: deliveredByRider.get(rider.id) ?? 0,
    }));
  }

  /** Rider detail with active tasks and the assignment audit trail. */
  async getRiderDetails(actor: AuthenticatedUser, riderId: string): Promise<RiderDetails> {
    const rider = await this.riderRepo.findOne({
      where: { id: riderId },
      relations: ["hub"],
    });
    if (!rider) {
      throw new NotFoundException({
        message: "Rider not found",
        error: ApiErrorCode.RIDER_NOT_FOUND,
      });
    }
    const hubIds = await this.visibleRiderHubIds(actor);
    if (!hubIds.includes(rider.hubId)) {
      throw new ForbiddenException({
        message: "Access denied: rider belongs to another hub",
        error: ApiErrorCode.RIDER_WRONG_HUB,
      });
    }

    const users = (await this.dataSource.getRepository("users" as never).findOne({
      where: { id: rider.userId },
    })) as unknown as { name?: string; email?: string; phone?: string } | null;

    const [activeTasks, assignments] = await Promise.all([
      this.parcelRepo.find({
        where: { currentRiderId: rider.id, status: In([...ACTIVE_TASK_STATUSES]) },
        order: { updatedAt: "DESC" },
        take: 100,
      }),
      this.assignmentRepo.find({
        where: { riderId: rider.id },
        order: { assignedAt: "DESC" },
        take: 100,
      }),
    ]);

    const trackingByParcel = new Map<string, string>();
    if (assignments.length > 0) {
      const parcels = await this.parcelRepo.find({
        where: { id: In([...new Set(assignments.map((a) => a.parcelId))]) },
        select: ["id", "trackingCode"],
      });
      for (const parcel of parcels) trackingByParcel.set(parcel.id, parcel.trackingCode);
    }

    const attemptCounts = await this.countAttempts(activeTasks.map((p) => p.id));

    return {
      id: rider.id,
      riderCode: rider.riderCode ?? "",
      name: users?.name ?? "",
      email: users?.email ?? "",
      phone: users?.phone ?? "",
      hubCode: rider.hub?.code ?? "",
      hubName: rider.hub?.name ?? "",
      status: rider.status,
      duty: this.toDuty(rider.status),
      activeTaskCount: activeTasks.length,
      deliveredTodayCount: 0,
      joinedAt: rider.joinedAt.toISOString(),
      activeTasks: activeTasks.map((parcel) => ({
        id: parcel.id,
        trackingCode: parcel.trackingCode,
        status: parcel.status,
        recipientName: parcel.recipientName,
        district: parcel.district,
        codCollected: null,
        attemptCount: attemptCounts.get(parcel.id) ?? 0,
        updatedAt: parcel.updatedAt.toISOString(),
      })),
      assignments: assignments.map((assignment) => ({
        id: assignment.id,
        parcelId: assignment.parcelId,
        trackingCode: trackingByParcel.get(assignment.parcelId) ?? "",
        riderId: assignment.riderId,
        assignedBy: assignment.assignedBy,
        assignedAt: assignment.assignedAt.toISOString(),
        unassignedAt: assignment.unassignedAt?.toISOString() ?? null,
      })),
    };
  }

  /* ================================================================== */
  /* Helpers                                                            */
  /* ================================================================== */

  private toDuty(status: RiderStatus): RiderDutyStatus {
    return status === RiderStatus.OFF_DUTY ? RiderDutyStatus.OFF_DUTY : RiderDutyStatus.ON_DUTY;
  }

  private async loadOwnedParcel(riderId: string, parcelId: string): Promise<Parcel> {
    const parcel = await this.parcelRepo.findOne({ where: { id: parcelId } });
    if (!parcel) {
      throw new NotFoundException({
        message: "Parcel not found",
        error: ApiErrorCode.PARCEL_NOT_FOUND,
      });
    }
    if (parcel.currentRiderId !== riderId) {
      throw new ForbiddenException({
        message: "This parcel is not assigned to you",
        error: ApiErrorCode.FORBIDDEN,
      });
    }
    return parcel;
  }

  private async lockOwnedParcel(
    manager: EntityManager,
    riderId: string,
    parcelId: string,
  ): Promise<Parcel> {
    const parcel = await manager
      .getRepository(Parcel)
      .createQueryBuilder("parcel")
      .setLock("pessimistic_write")
      .where("parcel.id = :parcelId", { parcelId })
      .getOne();
    if (!parcel) {
      throw new NotFoundException({
        message: "Parcel not found",
        error: ApiErrorCode.PARCEL_NOT_FOUND,
      });
    }
    if (parcel.currentRiderId !== riderId) {
      throw new ForbiddenException({
        message: "This parcel is not assigned to you",
        error: ApiErrorCode.FORBIDDEN,
      });
    }
    return parcel;
  }

  /**
   * Issues a fresh OTP secret for the parcel inside the transaction. Returns
   * the plaintext once — it is hashed before persistence and afterwards only
   * the customer (via SMS) knows it.
   */
  private async issueOtp(manager: EntityManager, parcel: Parcel): Promise<string> {
    const otp = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);
    parcel.deliveryOtpHash = await this.passwordService.hash(otp);
    parcel.otpExpiresAt = expiresAt;
    parcel.otpAttempts = 0;
    parcel.otpVerifiedAt = null;
    parcel.otpRequestCount += 1;
    parcel.lastOtpRequestedAt = new Date();
    await manager.getRepository(Parcel).save(parcel);
    return otp;
  }

  private isOtpExpired(parcel: Parcel): boolean {
    return !parcel.otpExpiresAt || parcel.otpExpiresAt.getTime() <= Date.now();
  }

  /**
   * Computes an OTP outcome and durably persists its side effects (wrong-guess
   * counter, verified flag, audit row). Never throws for a customer-facing
   * outcome — the caller maps the outcome to a response AFTER commit.
   */
  private async attemptOtpVerification(
    manager: EntityManager,
    parcel: Parcel,
    otp: string,
    riderId: string,
  ): Promise<
    | { kind: "verified"; verifiedAt: string; attemptsRemaining: number }
    | { kind: "already"; verifiedAt: string; attemptsRemaining: number }
    | { kind: "invalid"; attemptsRemaining: number }
    | { kind: "expired" }
    | { kind: "locked" }
    | { kind: "missing" }
  > {
    if (parcel.otpVerifiedAt) {
      return {
        kind: "already",
        verifiedAt: parcel.otpVerifiedAt.toISOString(),
        attemptsRemaining: OTP_MAX_ATTEMPTS - parcel.otpAttempts,
      };
    }
    if (!parcel.deliveryOtpHash) return { kind: "missing" };
    if (this.isOtpExpired(parcel)) return { kind: "expired" };
    if (parcel.otpAttempts >= OTP_MAX_ATTEMPTS) return { kind: "locked" };

    const match = await this.passwordService.compare(otp, parcel.deliveryOtpHash);
    if (!match) {
      parcel.otpAttempts += 1;
      await manager.getRepository(Parcel).save(parcel);
      const remaining = OTP_MAX_ATTEMPTS - parcel.otpAttempts;
      if (remaining <= 0) return { kind: "locked" };
      return { kind: "invalid", attemptsRemaining: remaining };
    }

    parcel.otpVerifiedAt = new Date();
    await manager.getRepository(Parcel).save(parcel);
    await this.appendHistory(manager, {
      parcelId: parcel.id,
      fromStatus: parcel.status,
      toStatus: parcel.status,
      eventType: "OTP_VERIFIED",
      actorId: riderId,
      actorRole: "RIDER",
      description: "Customer OTP verified at handoff",
      metadata: { riderId },
    });

    return {
      kind: "verified",
      verifiedAt: parcel.otpVerifiedAt.toISOString(),
      attemptsRemaining: OTP_MAX_ATTEMPTS - parcel.otpAttempts,
    };
  }

  /**
   * Replays a previously recorded delivery instead of duplicating it.
   * Returns null for legacy completions that predate the attempt log.
   */
  private async replayCompletedDelivery(
    manager: EntityManager,
    parcel: Parcel,
  ): Promise<CompleteDeliveryResult | null> {
    const attempt = await manager.getRepository(DeliveryAttempt).findOne({
      where: { parcelId: parcel.id, outcome: DeliveryAttemptOutcome.DELIVERED },
      order: { attemptNumber: "DESC" },
    });
    if (!attempt) return null;
    const ledger = await manager.getRepository(CashLedger).findOne({
      where: { parcelId: parcel.id },
    });
    const metadata = attempt.metadata ?? {};
    return {
      parcelId: parcel.id,
      trackingCode: parcel.trackingCode,
      status: parcel.status,
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      codAmountCollected:
        typeof metadata.codCollected === "number" ? metadata.codCollected : 0,
      cashLedgerId: ledger?.id ?? null,
      proof: {
        type: "OTP",
        verifiedAt:
          typeof metadata.otpVerifiedAt === "string" ? metadata.otpVerifiedAt : "",
        photoUrl: typeof metadata.proofPhotoUrl === "string" ? metadata.proofPhotoUrl : null,
      },
      message: "Parcel was already delivered. Replaying the recorded delivery.",
    };
  }

  private parseRescheduleDate(raw: string): Date {
    const date = new Date(raw.trim());
    if (Number.isNaN(date.getTime())) {
      throw new HttpException(
        {
          message: "Rescheduled date is not a valid date",
          error: ApiErrorCode.RESCHEDULE_INVALID,
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const now = Date.now();
    if (date.getTime() <= now) {
      throw new HttpException(
        {
          message: "Rescheduled date must be in the future",
          error: ApiErrorCode.RESCHEDULE_INVALID,
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (date.getTime() - now > RESCHEDULE_MAX_DAYS * 24 * 3600 * 1000) {
      throw new HttpException(
        {
          message: `Rescheduled date must be within ${RESCHEDULE_MAX_DAYS} days`,
          error: ApiErrorCode.RESCHEDULE_INVALID,
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return date;
  }

  private async countAttempts(parcelIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (parcelIds.length === 0) return counts;
    const rows = await this.attemptRepo
      .createQueryBuilder("attempt")
      .select("attempt.parcelId", "parcelId")
      .addSelect("COUNT(attempt.id)", "count")
      .where("attempt.parcelId IN (:...parcelIds)", { parcelIds })
      .groupBy("attempt.parcelId")
      .getRawMany<{ parcelId: string; count: string }>();
    for (const row of rows) counts.set(row.parcelId, Number(row.count));
    return counts;
  }

  private async appendHistory(
    manager: EntityManager,
    entry: {
      parcelId: string;
      fromStatus: ParcelStatus | null;
      toStatus: ParcelStatus;
      eventType?: string;
      actorId: string;
      actorRole: string;
      description: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await manager.getRepository(ParcelStatusHistory).save(
      manager.getRepository(ParcelStatusHistory).create({
        parcelId: entry.parcelId,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        eventType: entry.eventType ?? "STATUS_CHANGED",
        actorId: entry.actorId,
        actorRole: entry.actorRole,
        description: entry.description,
        metadata: entry.metadata ?? {},
      }),
    );
  }

  private async dispatchOutForDelivery(
    parcel: Parcel,
    riderId: string,
    otp: string | null,
  ): Promise<void> {
    // Single ownership: the outbox relay owns merchant in-app + webhook +
    // generic customer fan-out for OUT_FOR_DELIVERY. This critical path sends
    // ONLY the OTP SMS (which already tells the customer the parcel is out
    // for delivery). Sending the full notifyOutForDelivery here would
    // duplicate the merchant in-app row and the webhook delivery.
    // The OTP travels to the customer through the SMS body only. It is never
    // written to notification metadata, logs, or the rider response.
    void riderId;
    if (this.notificationsService && otp) {
      await this.notificationsService
        .sendDeliveryOtpSms(parcel.recipientPhone, parcel.trackingCode, otp)
        .catch((err) =>
          this.logger.warn(`Failed to dispatch out-for-delivery OTP SMS: ${err.message}`),
        );
    }
  }

  private async dispatchDeliveryComplete(
    parcel: Parcel,
    collectedAmount: number,
  ): Promise<void> {
    // Single ownership: PARCEL_DELIVERED fan-out (customer SMS + merchant
    // in-app/email + webhook) is owned by the outbox relay. The direct
    // notify + dispatch path was removed to prevent duplicate notifications
    // and duplicate webhook deliveries for the same event.
    // Kept as a no-op hook for observability; failures here never affect the
    // already-committed delivery transaction.
    void parcel;
    void collectedAmount;
    return;
  }

  /**
   * Hub ids whose riders the actor may see. Admins see every hub; hub managers
   * see only hubs they hold an active assignment for.
   */
  private async visibleRiderHubIds(
    actor: AuthenticatedUser,
    requestedHubId?: string,
  ): Promise<string[]> {
    if (actor.role === UserRole.ADMIN) {
      if (requestedHubId) return [requestedHubId];
      const hubs = await this.hubRepo.find({ select: ["id"] });
      return hubs.map((hub) => hub.id);
    }
    const assignments = await this.hubAssignmentRepo.find({
      where: { userId: actor.id, isActive: true },
      select: ["hubId"],
    });
    const hubIds = assignments.map((assignment) => assignment.hubId);
    if (requestedHubId) {
      return hubIds.includes(requestedHubId) ? [requestedHubId] : [];
    }
    return hubIds;
  }
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}
