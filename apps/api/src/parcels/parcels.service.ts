import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, DataSource, QueryFailedError, Repository } from "typeorm";
import {
  ApiErrorCode,
  DomainEventType,
  ParcelStatus,
  type ParcelBooking,
  type ParcelCreatedResponse,
  type ParcelDetailsResponse,
  type ParcelHistoryEntry,
  type ParcelListQuery,
  type ParcelSummary,
  type PublicTrackingResponse,
  type ShippingLabelResponse,
  type TimelineEvent,
} from "@dhruto/contracts";
import {
  Hub,
  Merchant,
  Parcel,
  ParcelAssignment,
  ParcelStatusHistory,
  Rider,
  OPERABLE_RIDER_STATUSES,
  UserRole,
} from "../database/entities/index.js";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import { PricingService } from "../pricing/pricing.service.js";
import {
  IdempotencyClaimConflict,
  IdempotencyService,
} from "../common/idempotency/idempotency.service.js";
import { generateBarcodeSvg } from "../common/utils/barcode.util.js";
import { OutboxService } from "../integrations/outbox.service.js";
import { DomainEventPublisher, ParcelCreatedEvent, ParcelAssignedEvent } from "../events/index.js";
import { IntelligenceService } from "../intelligence/intelligence.service.js";
import { CacheService } from "../common/cache/cache.service.js";
import { ParcelLifecycleService } from "./lifecycle/parcel-lifecycle.service.js";
import { TrackingCodeService } from "./services/tracking-code.service.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PARCEL_CREATE_SCOPE = "PARCEL_CREATE";
const TRACKING_CACHE_TTL_SECONDS = 60;
const DELIVERY_ACTOR_ROLE = "HUB_MANAGER";
/** Deterministic default routing facility until Phase 2 assigns real routing. */
const ORIGIN_HUB_CODE = "HUB-DHK-01";
const PG_UNIQUE_VIOLATION = "23505";
const BACKEND_UNKNOWN_ACTOR = "00000000-0000-0000-0000-000000000000";

/** English/Bangla public timeline copy. */
const STATUS_DESCRIPTIONS: Record<string, { en: string; bn: string }> = {
  [ParcelStatus.CREATED]: { en: "Booking Created", bn: "বুকিং সম্পন্ন হয়েছে" },
  [ParcelStatus.PICKUP_REQUESTED]: { en: "Pickup Requested", bn: "পিকআপের অনুরোধ গৃহীত হয়েছে" },
  [ParcelStatus.PICKUP_ASSIGNED]: {
    en: "Rider Assigned for Pickup",
    bn: "পিকআপের জন্য রাইডার নিযুক্ত",
  },
  [ParcelStatus.PICKED_UP]: { en: "Parcel Picked Up", bn: "পার্সেল পিকআপ সম্পন্ন হয়েছে" },
  [ParcelStatus.ORIGIN_HUB_RECEIVED]: {
    en: "Received at Sorting Hub",
    bn: "সর্টিং হাবে পার্সেল গৃহীত হয়েছে",
  },
  [ParcelStatus.BAGGED]: { en: "Packed in Transit Bag", bn: "ট্রানজিট ব্যাগে সংরক্ষিত" },
  [ParcelStatus.IN_TRANSIT]: {
    en: "In Transit to Destination Hub",
    bn: "গন্তব্য হাবে প্রেরিত হচ্ছে",
  },
  [ParcelStatus.DESTINATION_HUB_RECEIVED]: {
    en: "Reached Destination Hub",
    bn: "গন্তব্য ডেলিভারি হাবে পৌঁছেছে",
  },
  [ParcelStatus.ASSIGNED_TO_RIDER]: {
    en: "Assigned to Delivery Rider",
    bn: "ডেলিভারি রাইডার নির্ধারিত",
  },
  [ParcelStatus.OUT_FOR_DELIVERY]: { en: "Out for Delivery", bn: "ডেলিভারির জন্য বের হয়েছে" },
  [ParcelStatus.DELIVERY_ATTEMPTED]: {
    en: "Delivery Attempted",
    bn: "ডেলিভারির চেষ্টা করা হয়েছে",
  },
  [ParcelStatus.RESCHEDULED]: { en: "Delivery Rescheduled", bn: "ডেলিভারি পুনঃনির্ধারিত হয়েছে" },
  [ParcelStatus.DELIVERED]: { en: "Delivered to Recipient", bn: "সফলভাবে ডেলিভারি সম্পন্ন" },
  [ParcelStatus.CASH_PENDING]: {
    en: "Cash Collected from Recipient",
    bn: "ক্যাশ গ্রহণ করা হয়েছে",
  },
  [ParcelStatus.CASH_VERIFIED]: {
    en: "COD Amount Verified & Reconciled",
    bn: "ক্যাশ যাচাই সম্পন্ন",
  },
  [ParcelStatus.RTO_INITIATED]: {
    en: "Return to Merchant Initiated",
    bn: "মার্চেন্টকে ফেরত প্রক্রিয়া শুরু",
  },
  [ParcelStatus.RETURN_IN_TRANSIT]: {
    en: "Return in Transit",
    bn: "ফেরত পার্সেল ট্রানজিটে রয়েছে",
  },
  [ParcelStatus.RETURNED_TO_MERCHANT]: {
    en: "Returned to Merchant",
    bn: "মার্চেন্টের নিকট ফেরত সম্পন্ন",
  },
  [ParcelStatus.CANCELLED]: { en: "Order Cancelled", bn: "অর্ডার বাতিল করা হয়েছে" },
  [ParcelStatus.LOST]: { en: "Marked as Lost", bn: "হারিয়ে গেছে" },
  [ParcelStatus.DAMAGED]: { en: "Marked as Damaged", bn: "ক্ষতিগ্রস্ত হয়েছে" },
};

/** Tenant boundary for every parcel read/write. */
export interface ParcelAccessScope {
  userId: string;
  /** `undefined` means unscoped (platform admin). */
  merchantId?: string;
  isAdmin: boolean;
}

export interface ParcelPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  /** Opaque keyset cursor for the next page (null when exhausted). */
  nextCursor: string | null;
}

export interface ParcelListResult {
  items: ParcelSummary[];
  pagination: ParcelPaginationMeta;
}

export interface CreateParcelContext {
  user: AuthenticatedUser;
  idempotencyKey?: string;
}

@Injectable()
export class ParcelsService {
  private readonly logger = new Logger(ParcelsService.name);

  constructor(
    @InjectRepository(Parcel)
    private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(ParcelStatusHistory)
    private readonly historyRepo: Repository<ParcelStatusHistory>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Rider)
    private readonly riderRepo: Repository<Rider>,
    @InjectRepository(Hub)
    private readonly hubRepo: Repository<Hub>,
    private readonly dataSource: DataSource,
    private readonly pricingService: PricingService,
    private readonly idempotencyService: IdempotencyService,
    private readonly lifecycle: ParcelLifecycleService,
    private readonly trackingCodeService: TrackingCodeService,
    private readonly outboxService: OutboxService,
    @Optional()
    private readonly eventPublisher?: DomainEventPublisher,
    @Optional()
    private readonly intelligenceService?: IntelligenceService,
    @Optional()
    private readonly cacheService?: CacheService,
  ) {}

  /* ------------------------------------------------------------------ */
  /* Access scope                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Derives the tenant scope from the *authenticated* principal. A client can
   * never influence this: `merchantId` comes from the signed access token, never
   * from a request body or query parameter (docs/10-SECURITY.md §2).
   */
  async resolveScope(user: AuthenticatedUser): Promise<ParcelAccessScope> {
    if (user.role === UserRole.ADMIN) {
      return { userId: user.id, isAdmin: true };
    }
    const merchant = await this.requireMerchant(user);
    return { userId: user.id, isAdmin: false, merchantId: merchant.id };
  }

  private async requireMerchant(user: AuthenticatedUser): Promise<Merchant> {
    const merchant = user.merchantId
      ? await this.merchantRepo.findOne({ where: { id: user.merchantId } })
      : await this.merchantRepo.findOne({ where: { userId: user.id } });

    if (!merchant) {
      throw new ForbiddenException({
        message: "No merchant profile is associated with this account",
        error: ApiErrorCode.MERCHANT_NOT_FOUND,
      });
    }
    return merchant;
  }

  /**
   * Rejects cross-tenant access. A parcel owned by another merchant is reported
   * as not-found so the endpoint does not confirm its existence.
   */
  private assertOwnership(parcel: Parcel, scope: ParcelAccessScope): void {
    if (scope.isAdmin || !scope.merchantId) {
      return;
    }
    if (parcel.merchantId !== scope.merchantId) {
      this.logger.warn(
        `SECURITY_UNAUTHORIZED_PARCEL_ACCESS actor=${scope.userId} merchant=${scope.merchantId} parcel=${parcel.id}`,
      );
      throw new NotFoundException({
        message: "Parcel not found",
        error: ApiErrorCode.PARCEL_NOT_FOUND,
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Create                                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Creates a parcel booking.
   *
   * The parcel, its initial history row and the idempotency record are written
   * in a single transaction, so a partial booking can never be persisted. The
   * delivery fee is always computed by the backend; the client cannot supply it.
   */
  async createParcel(
    booking: ParcelBooking,
    context: CreateParcelContext,
  ): Promise<ParcelCreatedResponse> {
    const merchant = await this.requireMerchant(context.user);
    const idempotencyKey = context.idempotencyKey?.trim();
    const requestHash = IdempotencyService.fingerprint(booking);

    if (idempotencyKey) {
      const existing = await this.idempotencyService.find(idempotencyKey, PARCEL_CREATE_SCOPE);
      if (existing) {
        const resolution = await this.idempotencyService.resolve(
          idempotencyKey,
          PARCEL_CREATE_SCOPE,
          requestHash,
        );
        return this.resolveIdempotency(resolution, idempotencyKey);
      }
    }

    const pricing = this.pricingService.calculate({
      district: booking.district,
      thana: booking.thana,
      weight: booking.weight,
      codAmount: booking.codAmount,
    });

    const normalizedAddress = await this.buildNormalizedAddress(booking, pricing.zone);

    const attempts = TrackingCodeService.MAX_ATTEMPTS;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const trackingCode = this.trackingCodeService.generate();

      if (await this.parcelRepo.exists({ where: { trackingCode } })) {
        continue;
      }

      try {
        const response = await this.createParcelTransaction({
          merchant,
          booking,
          pricing,
          normalizedAddress,
          trackingCode,
          idempotencyKey,
          requestHash,
        });

        return response;
      } catch (error) {
        if (error instanceof IdempotencyClaimConflict) {
          const resolution = await this.idempotencyService.resolve(
            idempotencyKey as string,
            PARCEL_CREATE_SCOPE,
            requestHash,
          );
          return this.resolveIdempotency(resolution, idempotencyKey as string);
        }
        if (isTrackingCodeCollision(error)) {
          this.logger.warn(this.trackingCodeService.describeExhausted(attempt + 1));
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException({
      message: "Could not allocate a unique tracking code, please retry",
      error: ApiErrorCode.INTERNAL_SERVER_ERROR,
    });
  }

  private async createParcelTransaction(params: {
    merchant: Merchant;
    booking: ParcelBooking;
    pricing: ReturnType<PricingService["calculate"]>;
    normalizedAddress: Record<string, unknown>;
    trackingCode: string;
    idempotencyKey?: string;
    requestHash: string;
  }): Promise<ParcelCreatedResponse> {
    const {
      merchant,
      booking,
      pricing,
      normalizedAddress,
      trackingCode,
      idempotencyKey,
      requestHash,
    } = params;

    return this.dataSource.transaction<ParcelCreatedResponse>(async (manager) => {
      if (idempotencyKey) {
        await this.idempotencyService.claim(manager, {
          key: idempotencyKey,
          scope: PARCEL_CREATE_SCOPE,
          userId: merchant.userId,
          requestHash,
        });
      }

      const parcel = manager.create(Parcel, {
        merchantId: merchant.id,
        trackingCode,
        recipientName: booking.recipientName,
        recipientPhone: booking.recipientPhone,
        parcelDescription: booking.parcelDescription ?? null,
        rawAddress: booking.deliveryAddress,
        district: booking.district,
        thana: booking.thana,
        normalizedAddress: {
          ...normalizedAddress,
          district: booking.district,
          thana: booking.thana,
        },
        weight: Number(booking.weight),
        codAmount: Number(booking.codAmount),
        deliveryFee: pricing.totalFee,
        status: ParcelStatus.CREATED,
      });
      const saved = await manager.save(parcel);

      const history = manager.create(ParcelStatusHistory, {
        parcelId: saved.id,
        fromStatus: null,
        toStatus: ParcelStatus.CREATED,
        eventType: "PARCEL_CREATED",
        actorId: merchant.userId,
        actorRole: UserRole.MERCHANT,
        description: "Initial booking created",
        metadata: { pricing },
      });
      await manager.save(history);

      // Transactional domain event: stored atomically with the booking
      // so fan-out (notifications, webhooks) can never lose it. Transport
      // happens asynchronously in the outbox relay and workers.
      if (this.eventPublisher) {
        await this.eventPublisher.publish(
          manager,
          new ParcelCreatedEvent(
            {
              aggregateId: saved.id,
              merchantId: merchant.id,
            },
            {
              trackingCode: saved.trackingCode,
              recipientName: saved.recipientName,
              recipientPhone: saved.recipientPhone,
              district: saved.district,
              thana: saved.thana,
              deliveryAddress: saved.rawAddress,
              codAmount: Number(saved.codAmount),
              weight: Number(saved.weight),
              deliveryFee: Number(saved.deliveryFee),
            },
          ),
        );
      } else {
        await this.outboxService.append(manager, {
          eventType: DomainEventType.PARCEL_CREATED,
          aggregateType: "parcel",
          aggregateId: saved.id,
          actorId: merchant.userId,
          payload: {
            parcelId: saved.id,
            trackingCode: saved.trackingCode,
            merchantId: merchant.id,
            recipientName: saved.recipientName,
          },
        });
      }

      const response = this.toSummary(saved);

      if (idempotencyKey) {
        await this.idempotencyService.complete(manager, {
          key: idempotencyKey,
          scope: PARCEL_CREATE_SCOPE,
          statusCode: 201,
          response: response as unknown as Record<string, unknown>,
          userId: merchant.userId,
        });
      }

      this.logger.log(
        `PARCEL_CREATED parcel=${saved.id} trackingCode=${saved.trackingCode} merchant=${merchant.id} zone=${pricing.zone} totalFee=${pricing.totalFee}`,
      );

      return response;
    });
  }

  /** Enriches the parcel with Phase 6 intelligence metadata when available. */
  private async buildNormalizedAddress(
    booking: ParcelBooking,
    zone: string,
  ): Promise<Record<string, unknown>> {
    const base: Record<string, unknown> = { zone };

    if (!this.intelligenceService) {
      return base;
    }

    try {
      const analysis = await this.intelligenceService.analyzeBooking({
        recipientPhone: booking.recipientPhone,
        codAmount: Number(booking.codAmount),
        rawAddress: booking.deliveryAddress,
        district: booking.district,
        thana: booking.thana,
        weight: Number(booking.weight),
      });

      return {
        ...base,
        confidenceScore: analysis.parsedAddress.confidenceScore,
        confidenceTier: analysis.parsedAddress.confidenceTier,
        riskScore: analysis.riskProfile.riskScore,
        riskTier: analysis.riskProfile.riskTier,
        rtoProbability: analysis.riskProfile.rtoProbability,
      };
    } catch (error) {
      this.logger.warn(`Address intelligence skipped: ${(error as Error).message}`);
      return base;
    }
  }

  private resolveIdempotency(
    resolution:
      | { kind: "replay"; statusCode: number; response: Record<string, unknown> }
      | { kind: "conflict"; reason: "PAYLOAD_MISMATCH" }
      | { kind: "in_progress" },
    key: string,
  ): ParcelCreatedResponse {
    if (resolution.kind === "replay") {
      this.idempotencyService.logReplay(PARCEL_CREATE_SCOPE, key);
      return resolution.response as unknown as ParcelCreatedResponse;
    }

    if (resolution.kind === "conflict") {
      this.idempotencyService.logConflict(PARCEL_CREATE_SCOPE, key);
      throw new ConflictException({
        message: "This Idempotency-Key was already used with a different request payload",
        error: ApiErrorCode.IDEMPOTENCY_CONFLICT,
      });
    }

    throw new ConflictException({
      message: "A request with this Idempotency-Key is still in progress; retry shortly",
      error: ApiErrorCode.IDEMPOTENCY_IN_PROGRESS,
    });
  }

  /* ------------------------------------------------------------------ */
  /* Read                                                               */
  /* ------------------------------------------------------------------ */

  async listParcels(query: ParcelListQuery, scope: ParcelAccessScope): Promise<ParcelListResult> {
    const qb = this.parcelRepo.createQueryBuilder("parcel");

    if (scope.merchantId) {
      qb.andWhere("parcel.merchantId = :merchantId", {
        merchantId: scope.merchantId,
      });
    }
    if (query.status) {
      qb.andWhere("parcel.status = :status", { status: query.status });
    }
    if (query.district) {
      qb.andWhere("parcel.district ILIKE :district", {
        district: query.district,
      });
    }
    if (query.thana) {
      qb.andWhere("parcel.thana ILIKE :thana", { thana: query.thana });
    }
    if (query.from) {
      qb.andWhere("parcel.createdAt >= :from", { from: query.from });
    }
    if (query.to) {
      qb.andWhere("parcel.createdAt <= :to", { to: query.to });
    }
    if (query.search) {
      const term = `%${query.search}%`;
      qb.andWhere(
        new Brackets((inner) => {
          inner
            .where("parcel.trackingCode ILIKE :search", { search: term })
            .orWhere("parcel.recipientName ILIKE :search", { search: term })
            .orWhere("parcel.recipientPhone LIKE :search", { search: term });
        }),
      );
    }

    const sortColumn = PARCEL_SORT_COLUMNS[query.sort] ?? "parcel.createdAt";
    const cursor = decodeParcelCursor(query.cursor);
    if (cursor) {
      // Keyset mode: stable createdAt+id ordering in the requested direction.
      // No OFFSET — concurrent inserts can neither duplicate nor skip rows.
      qb.orderBy("parcel.createdAt", query.order);
      qb.addOrderBy("parcel.id", query.order === "ASC" ? "ASC" : "DESC");
      const op = query.order === "ASC" ? ">" : "<";
      qb.andWhere(
        new Brackets((inner) => {
          inner.where(`parcel.createdAt ${op} :cursorAt`, { cursorAt: cursor.createdAt }).orWhere(
            new Brackets((same) => {
              same
                .where("parcel.createdAt = :cursorAtEq", { cursorAtEq: cursor.createdAt })
                .andWhere(`parcel.id ${op} :cursorId`, { cursorId: cursor.id });
            }),
          );
        }),
      );
    } else {
      qb.orderBy(sortColumn, query.order);
      // Stable tiebreaker so pagination never repeats or skips rows.
      qb.addOrderBy("parcel.id", "DESC");
    }

    const page = query.page;
    const limit = query.limit;
    if (cursor) {
      // Fetch one extra row to detect the next page without a second query.
      qb.take(limit + 1);
    } else {
      qb.skip((page - 1) * limit).take(limit);
    }

    const [rows, total] = await qb.getManyAndCount();
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    let items = rows;
    let nextCursor: string | null = null;
    if (cursor) {
      if (rows.length > limit) {
        const last = rows[limit - 1];
        if (last) nextCursor = encodeParcelCursor(last.createdAt, last.id);
        items = rows.slice(0, limit);
      }
    } else if (rows.length === limit && page < totalPages && query.sort === "createdAt") {
      // Offset mode still emits a cursor (createdAt sorts only) so clients
      // can switch to keyset paging for subsequent pages without refetching.
      const last = rows[rows.length - 1];
      if (last) nextCursor = encodeParcelCursor(last.createdAt, last.id);
    }

    return {
      items: items.map((row) => this.toSummary(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: cursor ? nextCursor !== null : page < totalPages,
        hasPreviousPage: cursor ? true : page > 1,
        nextCursor,
      },
    };
  }

  async getParcelById(idOrCode: string, scope: ParcelAccessScope): Promise<ParcelDetailsResponse> {
    const parcel = await this.findParcelOrThrow(idOrCode, [
      "merchant",
      "currentHub",
      "currentRider",
      "currentRider.user",
    ]);
    this.assertOwnership(parcel, scope);

    const history = await this.historyRepo.find({
      where: { parcelId: parcel.id },
      order: { createdAt: "ASC" },
    });

    return {
      ...this.toSummary(parcel),
      merchantId: parcel.merchantId,
      merchantName: parcel.merchant?.businessName ?? "Dhruto Merchant",
      pickupAddress: parcel.merchant?.pickupAddress ?? "",
      currentRiderName: parcel.currentRider?.user?.name ?? null,
      currentHubName: parcel.currentHub?.name ?? null,
      addressIntelligence: this.toAddressIntelligence(parcel),
      history: history.map((entry) => this.toHistoryEntry(entry)),
    };
  }

  async getParcelHistory(
    idOrCode: string,
    scope: ParcelAccessScope,
  ): Promise<ParcelHistoryEntry[]> {
    const parcel = await this.findParcelOrThrow(idOrCode);
    this.assertOwnership(parcel, scope);

    const history = await this.historyRepo.find({
      where: { parcelId: parcel.id },
      order: { createdAt: "ASC" },
    });

    return history.map((entry) => this.toHistoryEntry(entry));
  }

  /** Public tracking. Never exposes merchant identity, money or internal IDs. */
  async getTracking(trackingCode: string): Promise<PublicTrackingResponse> {
    const code = trackingCode.trim().toUpperCase();
    const cacheKey = `tracking:${code}`;

    const build = async (): Promise<PublicTrackingResponse> => {
      const parcel = await this.parcelRepo.findOne({
        where: { trackingCode: code },
        relations: ["currentHub"],
      });

      if (!parcel) {
        throw new NotFoundException({
          message: "Tracking code not found",
          error: ApiErrorCode.TRACKING_NOT_FOUND,
        });
      }

      const history = await this.historyRepo.find({
        where: { parcelId: parcel.id },
        order: { createdAt: "ASC" },
      });

      const timeline: TimelineEvent[] = history.map((entry) => {
        const copy = STATUS_DESCRIPTIONS[entry.toStatus] ?? {
          en: entry.toStatus,
          bn: entry.toStatus,
        };
        return {
          status: entry.toStatus,
          labelEn: copy.en,
          labelBn: copy.bn,
          timestamp: entry.createdAt.toISOString(),
          note: entry.description ?? undefined,
        };
      });

      const legacy = this.readLegacyAddress(parcel);

      return {
        trackingCode: parcel.trackingCode,
        status: parcel.status,
        recipientDistrict: parcel.district ?? legacy.district,
        recipientThana: parcel.thana ?? legacy.thana,
        recipientPhoneMasked: this.maskPhone(parcel.recipientPhone),
        createdAt: parcel.createdAt.toISOString(),
        updatedAt: parcel.updatedAt.toISOString(),
        currentHubName: parcel.currentHub?.name ?? null,
        timeline,
      };
    };

    this.logger.log(`TRACKING_REQUESTED trackingCode=${code}`);

    if (!this.cacheService) {
      return build();
    }
    return this.cacheService.wrap(cacheKey, build, TRACKING_CACHE_TTL_SECONDS);
  }

  async getShippingLabel(
    idOrCode: string,
    scope: ParcelAccessScope,
  ): Promise<ShippingLabelResponse> {
    const parcel = await this.findParcelOrThrow(idOrCode, ["merchant", "currentHub"]);
    this.assertOwnership(parcel, scope);

    const legacy = this.readLegacyAddress(parcel);
    const district = parcel.district ?? legacy.district;
    const thana = parcel.thana ?? legacy.thana;
    const zone = this.pricingService.resolveZone(district, thana);
    const routingHub = await this.resolveRoutingHub(parcel);

    this.logger.log(`LABEL_GENERATED parcel=${parcel.id} trackingCode=${parcel.trackingCode}`);

    return {
      trackingCode: parcel.trackingCode,
      barcodeSvg: generateBarcodeSvg(parcel.trackingCode, {
        height: 50,
        barWidth: 2,
      }),
      merchantName: parcel.merchant?.businessName ?? "Dhruto Merchant",
      merchantPhone: parcel.merchant?.contactPhone ?? "",
      pickupAddress: parcel.merchant?.pickupAddress ?? "",
      recipientName: parcel.recipientName,
      recipientPhone: parcel.recipientPhone,
      deliveryAddress: parcel.rawAddress,
      district,
      thana,
      weightKg: Number(parcel.weight),
      codAmount: Number(parcel.codAmount),
      deliveryFee: Number(parcel.deliveryFee),
      zone,
      createdDate: parcel.createdAt.toISOString(),
      routingHub,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Operational commands (reserved for later phases)                    */
  /* ------------------------------------------------------------------ */

  /**
   * Assigns a delivery rider. Authorized for platform admins and hub managers
   * only, and gated by the centralized state machine.
   *
   * Rules:
   * - the rider must be operable (ACTIVE or ON_DUTY) and belong to the parcel's
   *   current hub — hub managers cannot assign across hubs;
   * - a fresh assignment requires DESTINATION_HUB_RECEIVED;
   * - reassignment is allowed before the delivery starts (ASSIGNED_TO_RIDER,
   *   DELIVERY_ATTEMPTED, RESCHEDULED) and closes the previous assignment row;
   * - once OUT_FOR_DELIVERY (or terminal) the task is locked to its rider.
   */
  async assignRider(
    parcelId: string,
    riderId: string,
    actor: AuthenticatedUser,
  ): Promise<{
    parcelId: string;
    trackingCode: string;
    riderId: string;
    status: ParcelStatus;
    reassigned: boolean;
    message: string;
  }> {
    if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.HUB_MANAGER) {
      throw new ForbiddenException({
        message: "Only admins and hub managers can assign riders",
        error: ApiErrorCode.FORBIDDEN,
      });
    }

    const rider = await this.riderRepo.findOne({ where: { id: riderId } });
    if (!rider) {
      throw new NotFoundException({
        message: "Rider not found",
        error: ApiErrorCode.RIDER_NOT_FOUND,
      });
    }
    if (!OPERABLE_RIDER_STATUSES.includes(rider.status)) {
      throw new ForbiddenException({
        message: `Rider is ${rider.status} and cannot receive new assignments`,
        error: ApiErrorCode.RIDER_INACTIVE,
      });
    }

    return this.dataSource.transaction(async (manager) => {
      const parcel = await manager.findOne(Parcel, {
        where: { id: parcelId },
        lock: { mode: "pessimistic_write" },
      });
      if (!parcel) {
        throw new NotFoundException({
          message: "Parcel not found",
          error: ApiErrorCode.PARCEL_NOT_FOUND,
        });
      }

      if (!parcel.currentHubId) {
        // Pre-hub pickup leg (PRE_PICKUP_RIDER_ASSIGNMENT_FROM): the rider
        // collects from the merchant, so the parcel adopts the rider's hub.
        parcel.currentHubId = rider.hubId;
      } else if (parcel.currentHubId !== rider.hubId) {
        throw new ForbiddenException({
          message: "Rider does not operate from the parcel's current hub",
          error: ApiErrorCode.RIDER_WRONG_HUB,
        });
      }

      const fromStatus = parcel.status;
      const reassignable: readonly ParcelStatus[] = [
        ParcelStatus.ASSIGNED_TO_RIDER,
        ParcelStatus.DELIVERY_ATTEMPTED,
        ParcelStatus.RESCHEDULED,
      ];
      const reassigned = reassignable.includes(fromStatus);
      const previousRiderId = parcel.currentRiderId;

      if (reassigned && previousRiderId === rider.id) {
        throw new ConflictException({
          message: "Parcel is already assigned to this rider",
          error: ApiErrorCode.RIDER_ALREADY_ASSIGNED,
        });
      }

      if (!reassigned) {
        // Fresh assignment follows the delivery matrix (destination-hub
        // receipt or the documented pre-pickup shortcut).
        this.lifecycle.assertTransition(fromStatus, ParcelStatus.ASSIGNED_TO_RIDER);
      }
      // Reassignment is an operational ownership change back to (or within)
      // ASSIGNED_TO_RIDER — e.g. DELIVERY_ATTEMPTED -> ASSIGNED_TO_RIDER for a
      // retry by another rider. It is not a forward lifecycle transition, so
      // the matrix does not govern it; the RIDER_REASSIGNED audit row below is
      // the control, and the parcel can never leave its hub leg this way.

      if (reassigned && previousRiderId) {
        await manager.update(
          ParcelAssignment,
          { parcelId: parcel.id, riderId: previousRiderId, unassignedAt: null },
          { unassignedAt: new Date() },
        );
      }

      parcel.currentRiderId = rider.id;
      parcel.status = ParcelStatus.ASSIGNED_TO_RIDER;
      await manager.save(parcel);

      const assignment = manager.create(ParcelAssignment, {
        parcelId: parcel.id,
        riderId: rider.id,
        assignedBy: UUID_REGEX.test(actor.id) ? actor.id : BACKEND_UNKNOWN_ACTOR,
        assignedAt: new Date(),
      });
      await manager.save(assignment);

      const history = manager.create(ParcelStatusHistory, {
        parcelId: parcel.id,
        fromStatus,
        toStatus: ParcelStatus.ASSIGNED_TO_RIDER,
        eventType: reassigned ? "RIDER_REASSIGNED" : "STATUS_CHANGED",
        actorId: UUID_REGEX.test(actor.id) ? actor.id : BACKEND_UNKNOWN_ACTOR,
        actorRole: DELIVERY_ACTOR_ROLE,
        description: reassigned
          ? `Reassigned from rider ${previousRiderId} to rider ${rider.id}`
          : `Assigned to rider ${rider.id}`,
        metadata: { riderId: rider.id, previousRiderId: previousRiderId ?? null },
      });
      await manager.save(history);

      if (this.eventPublisher) {
        await this.eventPublisher.publish(
          manager,
          new ParcelAssignedEvent(
            {
              aggregateId: parcel.id,
              merchantId: parcel.merchantId,
            },
            {
              trackingCode: parcel.trackingCode,
              riderId: rider.id,
              hubId: parcel.currentHubId,
            },
          ),
        );
      } else {
        await this.outboxService.append(manager, {
          eventType: DomainEventType.PARCEL_ASSIGNED,
          aggregateType: "parcel",
          aggregateId: parcel.id,
          actorId: UUID_REGEX.test(actor.id) ? actor.id : null,
          payload: {
            parcelId: parcel.id,
            trackingCode: parcel.trackingCode,
            merchantId: parcel.merchantId,
            recipientName: parcel.recipientName,
            riderId: rider.id,
            reassigned,
          },
        });
      }

      await this.cacheService?.del(`tracking:${parcel.trackingCode}`);

      this.logger.log(
        `PARCEL_RIDER_ASSIGNED parcel=${parcel.id} rider=${rider.id} actor=${actor.id} reassigned=${reassigned}`,
      );

      return {
        parcelId: parcel.id,
        trackingCode: parcel.trackingCode,
        riderId: rider.id,
        status: parcel.status,
        reassigned,
        message: reassigned
          ? "Parcel reassigned to rider successfully"
          : "Parcel assigned to rider successfully",
      };
    });
  }

  /* ------------------------------------------------------------------ */
  /* Mapping helpers                                                    */
  /* ------------------------------------------------------------------ */

  private async findParcelOrThrow(idOrCode: string, relations: string[] = []): Promise<Parcel> {
    const parcel = await this.parcelRepo.findOne({
      where: UUID_REGEX.test(idOrCode)
        ? { id: idOrCode }
        : { trackingCode: idOrCode.trim().toUpperCase() },
      relations,
    });

    if (!parcel) {
      throw new NotFoundException({
        message: "Parcel not found",
        error: ApiErrorCode.PARCEL_NOT_FOUND,
      });
    }
    return parcel;
  }

  private async resolveRoutingHub(parcel: Parcel): Promise<string> {
    if (parcel.currentHub) {
      return parcel.currentHub.name;
    }
    if (parcel.currentHubId) {
      const hub = await this.hubRepo.findOne({
        where: { id: parcel.currentHubId },
      });
      if (hub) {
        return hub.name;
      }
    }
    const originHub = await this.hubRepo.findOne({
      where: { code: ORIGIN_HUB_CODE },
      order: { createdAt: "ASC" },
    });
    if (originHub) {
      return originHub.name;
    }
    const anyHub = await this.hubRepo.findOne({
      order: { createdAt: "ASC" },
    });
    return anyHub?.name ?? "Dhruto Sorting Hub";
  }

  private readLegacyAddress(parcel: Parcel): {
    district: string;
    thana: string;
  } {
    const raw = parcel.normalizedAddress as Record<string, unknown> | null;
    return {
      district: typeof raw?.district === "string" ? raw.district : "",
      thana: typeof raw?.thana === "string" ? raw.thana : "",
    };
  }

  private toSummary(parcel: Parcel): ParcelSummary {
    const legacy = this.readLegacyAddress(parcel);
    return {
      id: parcel.id,
      trackingCode: parcel.trackingCode,
      recipientName: parcel.recipientName,
      recipientPhone: parcel.recipientPhone,
      district: parcel.district ?? legacy.district,
      thana: parcel.thana ?? legacy.thana,
      deliveryAddress: parcel.rawAddress,
      parcelDescription: parcel.parcelDescription ?? null,
      codAmount: Number(parcel.codAmount),
      weight: Number(parcel.weight),
      deliveryFee: Number(parcel.deliveryFee),
      status: parcel.status,
      createdAt: parcel.createdAt.toISOString(),
      updatedAt: parcel.updatedAt.toISOString(),
    };
  }

  /**
   * Projects the reserved `normalized_address` payload into the explicit
   * address-intelligence contract. Nothing else from that column is exposed.
   */
  private toAddressIntelligence(parcel: Parcel): ParcelDetailsResponse["addressIntelligence"] {
    const raw = (parcel.normalizedAddress ?? {}) as Record<string, unknown>;
    const legacy = this.readLegacyAddress(parcel);
    const number = (value: unknown): number | null => (typeof value === "number" ? value : null);
    const text = (value: unknown): string | null => (typeof value === "string" ? value : null);

    return {
      district: parcel.district ?? legacy.district,
      thana: parcel.thana ?? legacy.thana,
      zone: text(raw.zone),
      confidenceScore: number(raw.confidenceScore),
      confidenceTier: text(raw.confidenceTier),
      riskScore: number(raw.riskScore),
      riskTier: text(raw.riskTier),
      rtoProbability: number(raw.rtoProbability),
    };
  }

  private toHistoryEntry(entry: ParcelStatusHistory): ParcelHistoryEntry {
    return {
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      eventType: entry.eventType,
      description: entry.description,
      actorRole: entry.actorRole,
      createdAt: entry.createdAt.toISOString(),
    };
  }

  /** 01712345678 -> 017****5678 */
  private maskPhone(phone: string): string {
    if (!phone || phone.length < 8) {
      return "017****";
    }
    return phone.slice(0, 3) + "****" + phone.slice(-4);
  }
}

/** Whitelisted sortable columns — never accept arbitrary client column names. */
const PARCEL_SORT_COLUMNS: Record<string, string> = {
  createdAt: "parcel.createdAt",
  updatedAt: "parcel.updatedAt",
  codAmount: "parcel.codAmount",
  deliveryFee: "parcel.deliveryFee",
};

function isTrackingCodeCollision(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError = error.driverError as {
    code?: string;
    constraint?: string;
    detail?: string;
  };
  if (driverError?.code !== PG_UNIQUE_VIOLATION) {
    return false;
  }
  const haystack = `${driverError.constraint ?? ""} ${driverError.detail ?? ""}`.toLowerCase();
  return haystack.includes("tracking_code");
}

/* ------------------------------------------------------------------ */
/* Cursor helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Opaque keyset cursor: base64url(<ISO createdAt>|<uuid id>).
 * Invalid cursors return null so callers fall back to offset pagination
 * instead of failing the request.
 */
export function encodeParcelCursor(createdAt: Date, id: string): string {
  const raw = `${new Date(createdAt).toISOString()}|${id}`;
  return Buffer.from(raw, "utf8").toString("base64url");
}

export function decodeParcelCursor(
  cursor: string | undefined,
): { createdAt: Date; id: string } | null {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const separator = raw.lastIndexOf("|");
    if (separator <= 0) return null;
    const createdAt = new Date(raw.slice(0, separator));
    const id = raw.slice(separator + 1);
    if (Number.isNaN(createdAt.getTime()) || !/^[0-9a-f-]{36}$/i.test(id)) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}
