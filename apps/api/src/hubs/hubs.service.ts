import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, In, MoreThanOrEqual, Repository } from "typeorm";
import { randomUUID } from "node:crypto";
import {
  ApiErrorCode,
  BagStatus,
  ExceptionStatus,
  HubPermission,
  HubScanType,
  HubStatus,
  ManifestStatus,
  OperationalExceptionType,
  ParcelStatus,
  ScanOutcome,
  type BagDetails,
  type BagListItem,
  type BagParcelItem,
  type CreateBagDto,
  type CreateManifestDto,
  type HubDashboard,
  type HubInventory,
  type HubScanDto,
  type HubScanResult,
  type ManifestDetails,
  type ManifestListItem,
  type ManifestReconciliation,
  type OperationalExceptionItem,
  type ParcelScanItem,
  type ReceiveManifestDto,
  type ResolveExceptionDto,
  type SealBagDto,
} from "@dhruto/contracts";
import {
  Bag,
  BagParcel,
  Hub,
  Manifest,
  ManifestItem,
  OperationalException,
  Parcel,
  ParcelScan,
  ParcelStatusHistory,
  User,
} from "../database/entities/index.js";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import { ParcelLifecycleService } from "../parcels/lifecycle/parcel-lifecycle.service.js";
import { HubAuthorizationService } from "./hub-authorization.service.js";

/** Bags that still accept parcels. */
const OPEN_BAG_STATUSES: readonly BagStatus[] = [BagStatus.OPEN];

/** Manifest statuses that mean the manifest is physically on the road. */
const MANIFEST_IN_TRANSIT_STATUSES: readonly ManifestStatus[] = [
  ManifestStatus.DISPATCHED,
  ManifestStatus.IN_TRANSIT,
];

/** Parcel statuses that count as "still inside the hub network". */
const ACTIVE_PARCEL_STATUSES: readonly ParcelStatus[] = [
  ParcelStatus.PICKED_UP,
  ParcelStatus.ORIGIN_HUB_RECEIVED,
  ParcelStatus.BAGGED,
  ParcelStatus.IN_TRANSIT,
  ParcelStatus.DESTINATION_HUB_RECEIVED,
  ParcelStatus.ASSIGNED_TO_RIDER,
  ParcelStatus.OUT_FOR_DELIVERY,
];

/** The status a scan type must move the parcel to, when it changes state. */
const SCAN_TARGET_STATUS: Partial<Record<HubScanType, ParcelStatus>> = {
  [HubScanType.RECEIVE_INBOUND]: ParcelStatus.ORIGIN_HUB_RECEIVED,
  [HubScanType.BAG_PARCEL]: ParcelStatus.BAGGED,
  [HubScanType.DISPATCH_BAG]: ParcelStatus.IN_TRANSIT,
  [HubScanType.RECEIVE_TRANSFER]: ParcelStatus.DESTINATION_HUB_RECEIVED,
};

@Injectable()
export class HubsService {
  private readonly logger = new Logger(HubsService.name);

  constructor(
    @InjectRepository(Hub)
    private readonly hubRepo: Repository<Hub>,
    @InjectRepository(Bag)
    private readonly bagRepo: Repository<Bag>,
    @InjectRepository(BagParcel)
    private readonly bagParcelRepo: Repository<BagParcel>,
    @InjectRepository(Manifest)
    private readonly manifestRepo: Repository<Manifest>,
    @InjectRepository(ManifestItem)
    private readonly manifestItemRepo: Repository<ManifestItem>,
    @InjectRepository(Parcel)
    private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(ParcelScan)
    private readonly scanRepo: Repository<ParcelScan>,
    @InjectRepository(OperationalException)
    private readonly exceptionRepo: Repository<OperationalException>,
    private readonly dataSource: DataSource,
    private readonly authz: HubAuthorizationService,
    private readonly lifecycle: ParcelLifecycleService,
  ) {}

  /* ================================================================== */
  /* Hubs                                                               */
  /* ================================================================== */

  /** Hubs the authenticated actor may operate on (drives the hub selector). */
  async listHubs(user: AuthenticatedUser): Promise<Hub[]> {
    return this.authz.listAuthorizedHubs(user);
  }

  async getHub(user: AuthenticatedUser, hubIdOrCode: string): Promise<Hub> {
    const hub = await this.authz.resolveHub(hubIdOrCode);
    await this.authz.assertHubVisible(user, hub);
    return hub;
  }

  /**
   * Every ACTIVE hub, for destination selection when creating a bag or
   * manifest. Routing metadata only — this deliberately exposes no operational
   * data, and bag/manifest creation still validates the chosen hub server-side.
   */
  async listDestinationHubs(): Promise<Hub[]> {
    return this.hubRepo.find({
      where: { status: HubStatus.ACTIVE },
      order: { name: "ASC" },
    });
  }

  /**
   * Operational dashboard. Every number is a real aggregate query — there are
   * no placeholder or fabricated metrics (spec §10).
   */
  async getDashboard(user: AuthenticatedUser, hubIdOrCode: string): Promise<HubDashboard> {
    const hub = await this.authz.assertHubAccess(user, hubIdOrCode, HubPermission.VIEW, {
      requireActive: false,
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      inboundToday,
      outboundToday,
      parcelsAtHub,
      openBags,
      sealedBags,
      pendingManifests,
      dispatchedManifests,
      expectedInboundManifests,
      openExceptions,
      recentScans,
    ] = await Promise.all([
      this.scanRepo.count({
        where: {
          hubId: hub.id,
          scanType: In([HubScanType.RECEIVE_INBOUND, HubScanType.RECEIVE_TRANSFER]),
          outcome: ScanOutcome.APPLIED,
          createdAt: MoreThanOrEqual(startOfToday),
        },
      }),
      this.scanRepo.count({
        where: {
          hubId: hub.id,
          scanType: HubScanType.DISPATCH_BAG,
          outcome: ScanOutcome.APPLIED,
          createdAt: MoreThanOrEqual(startOfToday),
        },
      }),
      this.parcelRepo.count({
        where: { currentHubId: hub.id, status: In(ACTIVE_PARCEL_STATUSES) },
      }),
      this.bagRepo.count({
        where: { originHubId: hub.id, status: BagStatus.OPEN },
      }),
      this.bagRepo.count({
        where: { originHubId: hub.id, status: BagStatus.SEALED },
      }),
      this.manifestRepo.count({
        where: { originHubId: hub.id, status: ManifestStatus.CREATED },
      }),
      this.manifestRepo.count({
        where: {
          originHubId: hub.id,
          status: In(MANIFEST_IN_TRANSIT_STATUSES),
        },
      }),
      this.manifestRepo.count({
        where: {
          destinationHubId: hub.id,
          status: In(MANIFEST_IN_TRANSIT_STATUSES),
        },
      }),
      this.exceptionRepo.count({
        where: { hubId: hub.id, status: ExceptionStatus.OPEN },
      }),
      this.listScans(user, hub.id, { limit: 10 }),
    ]);

    return {
      hub: this.toHubSummary(hub),
      metrics: {
        inboundToday,
        outboundToday,
        parcelsAtHub,
        openBags,
        sealedBags,
        pendingManifests,
        dispatchedManifests,
        expectedInboundManifests,
        openExceptions,
      },
      recentScans,
    };
  }

  /**
   * Parcels physically at this hub plus live counts.
   *
   * Scoped strictly to `current_hub_id = hub.id`: the previous implementation
   * also matched parcels with an unset hub and status CREATED, which leaked
   * every merchant's uncollected bookings.
   */
  async getHubInventory(user: AuthenticatedUser, hubIdOrCode: string): Promise<HubInventory> {
    const hub = await this.authz.assertHubAccess(user, hubIdOrCode, HubPermission.VIEW, {
      requireActive: false,
    });

    const parcelsAtHub = await this.parcelRepo.find({
      where: {
        currentHubId: hub.id,
        status: In(ACTIVE_PARCEL_STATUSES),
      },
      order: { updatedAt: "DESC" },
      take: 100,
    });

    const [inboundCount, receivedCount, baggedCount, openBagsCount] = await Promise.all([
      this.parcelRepo.count({
        where: {
          currentHubId: hub.id,
          status: In([ParcelStatus.PICKED_UP, ParcelStatus.ORIGIN_HUB_RECEIVED]),
        },
      }),
      this.parcelRepo.count({
        where: {
          currentHubId: hub.id,
          status: ParcelStatus.DESTINATION_HUB_RECEIVED,
        },
      }),
      this.parcelRepo.count({
        where: { currentHubId: hub.id, status: ParcelStatus.BAGGED },
      }),
      this.bagRepo.count({
        where: { originHubId: hub.id, status: BagStatus.OPEN },
      }),
    ]);

    return {
      hub: this.toHubSummary(hub),
      counts: { inboundCount, receivedCount, baggedCount, openBagsCount },
      parcels: parcelsAtHub.map((parcel) => ({
        id: parcel.id,
        trackingCode: parcel.trackingCode,
        recipientName: parcel.recipientName,
        district: parcel.district,
        status: parcel.status,
        updatedAt: parcel.updatedAt.toISOString(),
      })),
    };
  }

  /* ================================================================== */
  /* Scanning                                                           */
  /* ================================================================== */

  /**
   * Processes one scan.
   *
   * Guarantees:
   *  - Authorization is resolved from the authenticated actor, never from the
   *    client-supplied hub id alone.
   *  - Every attempt is written to the append-only `parcel_scans` log,
   *    including rejected and duplicate attempts.
   *  - A repeated `idempotencyKey` replays the stored outcome instead of
   *    re-applying the operation.
   *  - The status change, history row and scan row commit in one transaction,
   *    and the parcel row is locked so concurrent operators cannot both win.
   */
  async scanBarcode(
    user: AuthenticatedUser,
    hubIdOrCode: string,
    dto: HubScanDto,
  ): Promise<HubScanResult> {
    const hub = await this.authz.assertHubAccess(user, hubIdOrCode, HubPermission.SCAN);

    const barcode = dto.barcode.trim().toUpperCase();

    // Retry safety: a resubmitted scan must not re-apply the operation.
    if (dto.idempotencyKey) {
      const existing = await this.scanRepo.findOne({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        let currentStatus = "UNKNOWN";
        if (existing.parcelId) {
          const parcel = await this.parcelRepo.findOne({
            where: { id: existing.parcelId },
            select: ["id", "status"],
          });
          currentStatus = parcel?.status ?? "UNKNOWN";
        } else if (existing.bagId) {
          const bag = await this.bagRepo.findOne({
            where: { id: existing.bagId },
            select: ["id", "status"],
          });
          currentStatus = bag?.status ?? "UNKNOWN";
        }

        return this.resultFromScan(existing, hub, {
          outcome:
            existing.outcome === ScanOutcome.APPLIED ? ScanOutcome.DUPLICATE : existing.outcome,
          reasonCode: existing.reasonCode ?? "DUPLICATE_SUBMISSION",
          currentStatus,
          previousStatus: currentStatus,
          message:
            existing.outcome === ScanOutcome.APPLIED
              ? `Duplicate submission ignored; ${existing.barcode} was already processed`
              : `Duplicate submission replayed a rejected scan (${existing.reasonCode ?? "REJECTED"})`,
        });
      }
    }

    if (barcode.startsWith("BAG-")) {
      return this.scanBag(user, hub, barcode, dto);
    }

    return this.scanParcel(user, hub, barcode, dto);
  }

  private async scanParcel(
    user: AuthenticatedUser,
    hub: Hub,
    barcode: string,
    dto: HubScanDto,
  ): Promise<HubScanResult> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Lock the parcel so two concurrent scans are serialized.
        const parcel = await manager
          .getRepository(Parcel)
          .createQueryBuilder("parcel")
          .setLock("pessimistic_write")
          .where("parcel.tracking_code = :barcode", { barcode })
          .getOne();

        if (!parcel) {
          throw new NotFoundException({
            message: `Parcel with tracking code "${barcode}" not found`,
            error: ApiErrorCode.PARCEL_NOT_FOUND,
          });
        }

        const previousStatus = parcel.status;
        const targetStatus = SCAN_TARGET_STATUS[dto.scanType];

        // Duplicate detection: the parcel already reached the target state.
        if (targetStatus && previousStatus === targetStatus) {
          const result = await this.persistScan(manager, {
            parcelId: parcel.id,
            bagId: dto.bagId ?? null,
            hubId: hub.id,
            scanType: dto.scanType,
            outcome: ScanOutcome.DUPLICATE,
            reasonCode: "ALREADY_PROCESSED",
            barcode,
            operatorId: user.id,
            idempotencyKey: dto.idempotencyKey ?? null,
            notes: dto.notes ?? null,
          });

          await this.raiseException(manager, {
            hubId: hub.id,
            parcelId: parcel.id,
            bagId: dto.bagId ?? null,
            type: OperationalExceptionType.DUPLICATE_SCAN,
            description: `Parcel ${parcel.trackingCode} was scanned again for ${dto.scanType} while already in status ${previousStatus}.`,
            actorId: user.id,
          });

          return this.resultFromScan(result, hub, {
            outcome: ScanOutcome.DUPLICATE,
            reasonCode: "ALREADY_PROCESSED",
            message: `Parcel ${parcel.trackingCode} was already processed at this stage (status ${previousStatus}).`,
            previousStatus,
            currentStatus: parcel.status,
            parcelId: parcel.id,
          });
        }

        // State machine enforcement — never assign status directly.
        if (targetStatus) {
          this.lifecycle.assertTransition(previousStatus, targetStatus);
        }

        switch (dto.scanType) {
          case HubScanType.RECEIVE_INBOUND: {
            await this.assertHubCanReceive(parcel, hub);

            parcel.status = ParcelStatus.ORIGIN_HUB_RECEIVED;
            parcel.currentHubId = hub.id;
            await manager.getRepository(Parcel).save(parcel);

            await this.appendHistory(manager, {
              parcelId: parcel.id,
              fromStatus: previousStatus,
              toStatus: ParcelStatus.ORIGIN_HUB_RECEIVED,
              actorId: user.id,
              actorRole: user.role,
              description: `Inbound scanned into ${hub.name} (${hub.code})`,
              hubId: hub.id,
            });
            break;
          }

          case HubScanType.BAG_PARCEL: {
            if (!dto.bagId) {
              throw new BadRequestException({
                message: "bagId is required when scanning for BAG_PARCEL",
                error: ApiErrorCode.VALIDATION_ERROR,
              });
            }
            await this.addParcelToBagWithinTransaction(manager, dto.bagId, parcel, hub, user);
            break;
          }

          case HubScanType.RECEIVE_TRANSFER: {
            await this.assertHubCanReceive(parcel, hub);

            parcel.status = ParcelStatus.DESTINATION_HUB_RECEIVED;
            parcel.currentHubId = hub.id;
            await manager.getRepository(Parcel).save(parcel);

            await this.appendHistory(manager, {
              parcelId: parcel.id,
              fromStatus: previousStatus,
              toStatus: ParcelStatus.DESTINATION_HUB_RECEIVED,
              actorId: user.id,
              actorRole: user.role,
              description: `Received at destination hub ${hub.name} (${hub.code})`,
              hubId: hub.id,
            });
            break;
          }

          case HubScanType.EXCEPTION: {
            if (!dto.notes) {
              throw new BadRequestException({
                message: "notes are required when raising an EXCEPTION scan",
                error: ApiErrorCode.VALIDATION_ERROR,
              });
            }
            await this.raiseException(manager, {
              hubId: hub.id,
              parcelId: parcel.id,
              bagId: dto.bagId ?? null,
              type: OperationalExceptionType.INVALID_STATE,
              description: dto.notes,
              actorId: user.id,
            });
            break;
          }

          case HubScanType.SORT:
          default:
            // Verification only: no state change, but still recorded.
            break;
        }

        const scan = await this.persistScan(manager, {
          parcelId: parcel.id,
          bagId: dto.bagId ?? null,
          hubId: hub.id,
          scanType: dto.scanType,
          outcome: ScanOutcome.APPLIED,
          reasonCode: null,
          barcode,
          operatorId: user.id,
          idempotencyKey: dto.idempotencyKey ?? null,
          notes: dto.notes ?? null,
        });

        return this.resultFromScan(scan, hub, {
          outcome: ScanOutcome.APPLIED,
          message: this.appliedMessage(dto.scanType, parcel, hub),
          previousStatus,
          currentStatus: parcel.status,
          parcelId: parcel.id,
          itemType: "PARCEL",
        });
      });
    } catch (error) {
      await this.recordRejectedScan(hub, barcode, dto, user, error);
      throw error;
    }
  }

  private async scanBag(
    user: AuthenticatedUser,
    hub: Hub,
    barcode: string,
    dto: HubScanDto,
  ): Promise<HubScanResult> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const bag = await manager
          .getRepository(Bag)
          .createQueryBuilder("bag")
          .setLock("pessimistic_write")
          .leftJoinAndSelect("bag.originHub", "originHub")
          .leftJoinAndSelect("bag.destinationHub", "destinationHub")
          .where("bag.bag_code = :barcode", { barcode })
          .getOne();

        if (!bag) {
          throw new NotFoundException({
            message: `Bag with code "${barcode}" not found`,
            error: ApiErrorCode.BAG_NOT_FOUND,
          });
        }

        const previousStatus = bag.status;

        if (dto.scanType === HubScanType.RECEIVE_TRANSFER) {
          if (bag.destinationHubId !== hub.id) {
            throw new BadRequestException({
              message: `Bag ${bag.bagCode} is destined for ${
                bag.destinationHub?.code ?? bag.destinationHubId
              }, not ${hub.code}`,
              error: ApiErrorCode.PARCEL_WRONG_HUB,
            });
          }
          if (bag.status !== BagStatus.IN_TRANSIT) {
            throw new BadRequestException({
              message: `Bag ${bag.bagCode} is ${bag.status} and cannot be received`,
              error: ApiErrorCode.BAG_INVALID_STATE,
            });
          }

          await this.receiveBagWithinTransaction(manager, bag, hub, user);

          const scan = await this.persistScan(manager, {
            parcelId: null,
            bagId: bag.id,
            hubId: hub.id,
            scanType: dto.scanType,
            outcome: ScanOutcome.APPLIED,
            reasonCode: null,
            barcode,
            operatorId: user.id,
            idempotencyKey: dto.idempotencyKey ?? null,
            notes: dto.notes ?? null,
          });

          return this.resultFromScan(scan, hub, {
            outcome: ScanOutcome.APPLIED,
            message: `Bag ${bag.bagCode} received at ${hub.name}`,
            previousStatus,
            currentStatus: BagStatus.RECEIVED,
            bagId: bag.id,
            itemType: "BAG",
            routingInfo: {
              originHubName: bag.originHub?.name,
              destinationHubName: hub.name,
            },
          });
        }

        if (dto.scanType === HubScanType.DISPATCH_BAG) {
          if (bag.originHubId !== hub.id) {
            throw new BadRequestException({
              message: `Bag ${bag.bagCode} does not belong to ${hub.code}`,
              error: ApiErrorCode.HUB_MISMATCH,
            });
          }
          if (bag.status !== BagStatus.SEALED) {
            throw new BadRequestException({
              message: `Bag ${bag.bagCode} must be SEALED before dispatch (currently ${bag.status})`,
              error: ApiErrorCode.BAG_INVALID_STATE,
            });
          }

          await this.dispatchBagWithinTransaction(manager, bag, hub, user);

          const scan = await this.persistScan(manager, {
            parcelId: null,
            bagId: bag.id,
            hubId: hub.id,
            scanType: dto.scanType,
            outcome: ScanOutcome.APPLIED,
            reasonCode: null,
            barcode,
            operatorId: user.id,
            idempotencyKey: dto.idempotencyKey ?? null,
            notes: dto.notes ?? null,
          });

          return this.resultFromScan(scan, hub, {
            outcome: ScanOutcome.APPLIED,
            message: `Bag ${bag.bagCode} dispatched to ${
              bag.destinationHub?.name ?? "destination hub"
            }`,
            previousStatus,
            currentStatus: BagStatus.IN_TRANSIT,
            bagId: bag.id,
            itemType: "BAG",
            routingInfo: {
              originHubName: hub.name,
              destinationHubName: bag.destinationHub?.name,
            },
          });
        }

        // Any other scan type on a bag is a verification-only record.
        const scan = await this.persistScan(manager, {
          parcelId: null,
          bagId: bag.id,
          hubId: hub.id,
          scanType: dto.scanType,
          outcome: ScanOutcome.APPLIED,
          reasonCode: null,
          barcode,
          operatorId: user.id,
          idempotencyKey: dto.idempotencyKey ?? null,
          notes: dto.notes ?? null,
        });

        return this.resultFromScan(scan, hub, {
          outcome: ScanOutcome.APPLIED,
          message: `Bag ${bag.bagCode} verified (status ${bag.status})`,
          previousStatus,
          currentStatus: bag.status,
          bagId: bag.id,
          itemType: "BAG",
        });
      });
    } catch (error) {
      await this.recordRejectedScan(hub, barcode, dto, user, error);
      throw error;
    }
  }

  /** The parcel must not already be past this hub's leg of the journey. */
  private async assertHubCanReceive(parcel: Parcel, hub: Hub): Promise<void> {
    const terminalStatuses: ParcelStatus[] = [
      ParcelStatus.DELIVERED,
      ParcelStatus.CASH_PENDING,
      ParcelStatus.CASH_VERIFIED,
      ParcelStatus.RETURNED_TO_MERCHANT,
      ParcelStatus.CANCELLED,
      ParcelStatus.LOST,
    ];

    if (terminalStatuses.includes(parcel.status)) {
      throw new BadRequestException({
        message: `Parcel ${parcel.trackingCode} is ${parcel.status} and cannot be received at ${hub.code}`,
        error: ApiErrorCode.INVALID_STATUS_TRANSITION,
      });
    }
  }

  /** Scan history for a hub, newest first. */
  async listScans(
    user: AuthenticatedUser,
    hubIdOrCode: string,
    options: { limit?: number; scanType?: HubScanType; outcome?: ScanOutcome } = {},
  ): Promise<ParcelScanItem[]> {
    const hub = await this.authz.assertHubAccess(user, hubIdOrCode, HubPermission.VIEW, {
      requireActive: false,
    });

    const scans = await this.scanRepo.find({
      where: {
        hubId: hub.id,
        ...(options.scanType ? { scanType: options.scanType } : {}),
        ...(options.outcome ? { outcome: options.outcome } : {}),
      },
      order: { createdAt: "DESC" },
      take: Math.min(options.limit ?? 50, 200),
    });

    const codes = scans.map((scan) => scan.parcelId).filter((id): id is string => id !== null);
    const bagIds = scans.map((scan) => scan.bagId).filter((id): id is string => id !== null);
    const operatorIds = [
      ...new Set(scans.map((scan) => scan.operatorId).filter((id): id is string => id !== null)),
    ];

    const [parcels, bags, operators] = await Promise.all([
      codes.length
        ? this.parcelRepo.find({
            where: { id: In(codes) },
            select: ["id", "trackingCode"],
          })
        : Promise.resolve([]),
      bagIds.length
        ? this.bagRepo.find({
            where: { id: In(bagIds) },
            select: ["id", "bagCode"],
          })
        : Promise.resolve([]),
      operatorIds.length
        ? this.parcelRepo.manager.getRepository(User).find({
            where: { id: In(operatorIds) },
            select: ["id", "name"],
          })
        : Promise.resolve([]),
    ]);

    const parcelById = new Map(parcels.map((p) => [p.id, p.trackingCode]));
    const bagById = new Map(bags.map((b) => [b.id, b.bagCode]));
    const operatorById = new Map(operators.map((o) => [o.id, o.name]));

    return scans.map((scan) => ({
      id: scan.id,
      trackingCode: scan.parcelId ? (parcelById.get(scan.parcelId) ?? null) : null,
      bagCode: scan.bagId ? (bagById.get(scan.bagId) ?? null) : null,
      hubCode: hub.code,
      hubName: hub.name,
      scanType: scan.scanType,
      outcome: scan.outcome,
      reasonCode: scan.reasonCode,
      operatorName: scan.operatorId ? (operatorById.get(scan.operatorId) ?? null) : null,
      notes: scan.notes,
      createdAt: scan.createdAt.toISOString(),
    }));
  }

  /** Operator parcel lookup by tracking code. Never exposes merchant pricing. */
  async lookupParcel(user: AuthenticatedUser, hubIdOrCode: string, trackingCode: string) {
    await this.authz.assertHubAccess(user, hubIdOrCode, HubPermission.VIEW, {
      requireActive: false,
    });

    const parcel = await this.parcelRepo.findOne({
      where: { trackingCode: trackingCode.trim().toUpperCase() },
    });

    if (!parcel) {
      throw new NotFoundException({
        message: `Parcel "${trackingCode}" not found`,
        error: ApiErrorCode.PARCEL_NOT_FOUND,
      });
    }

    return {
      id: parcel.id,
      trackingCode: parcel.trackingCode,
      recipientName: parcel.recipientName,
      district: parcel.district,
      thana: parcel.thana,
      weightKg: Number(parcel.weight),
      status: parcel.status,
      currentHubId: parcel.currentHubId,
    };
  }

  /* ================================================================== */
  /* Bags                                                               */
  /* ================================================================== */

  async createBag(
    user: AuthenticatedUser,
    hubIdOrCode: string,
    dto: CreateBagDto,
  ): Promise<BagDetails> {
    const originHub = await this.authz.assertHubAccess(user, hubIdOrCode, HubPermission.BAG_CREATE);
    const destinationHub = await this.authz.resolveHub(dto.destinationHubId);

    if (destinationHub.id === originHub.id) {
      throw new BadRequestException({
        message: "A bag cannot be created for its own origin hub",
        error: ApiErrorCode.VALIDATION_ERROR,
      });
    }

    const bag = await this.bagRepo.save(
      this.bagRepo.create({
        bagCode: this.generateBagCode(originHub.code, destinationHub.code),
        originHubId: originHub.id,
        destinationHubId: destinationHub.id,
        status: BagStatus.OPEN,
        notes: dto.notes ?? null,
        sealTag: dto.sealTag ?? null,
        createdBy: user.id,
      }),
    );

    this.logger.log(`HUB_BAG_CREATED hub=${originHub.code} bag=${bag.bagCode} actor=${user.id}`);

    return this.getBag(user, bag.id);
  }

  async listBags(
    user: AuthenticatedUser,
    hubIdOrCode: string | undefined,
    status?: BagStatus,
  ): Promise<BagListItem[]> {
    const hubIds = await this.authorizedHubIdsOrThrow(user, hubIdOrCode);

    if (hubIds.length === 0) return [];

    const bags = await this.bagRepo
      .createQueryBuilder("bag")
      .leftJoinAndSelect("bag.originHub", "originHub")
      .leftJoinAndSelect("bag.destinationHub", "destinationHub")
      .leftJoinAndSelect("bag.bagParcels", "bagParcels")
      .leftJoinAndSelect("bagParcels.parcel", "parcel")
      .where("(bag.origin_hub_id IN (:...hubIds) OR bag.destination_hub_id IN (:...hubIds))", {
        hubIds,
      })
      .andWhere(status ? "bag.status = :status" : "1=1", status ? { status } : {})
      .orderBy("bag.createdAt", "DESC")
      .take(200)
      .getMany();

    return bags.map((bag) => this.toBagListItem(bag));
  }

  async getBag(user: AuthenticatedUser, bagId: string): Promise<BagDetails> {
    const bag = await this.bagRepo.findOne({
      where: { id: bagId },
      relations: ["originHub", "destinationHub", "bagParcels", "bagParcels.parcel"],
    });

    if (!bag) {
      throw new NotFoundException({
        message: `Bag with ID "${bagId}" not found`,
        error: ApiErrorCode.BAG_NOT_FOUND,
      });
    }

    await this.assertBagVisible(user, bag);

    const manifestItem = await this.manifestItemRepo.findOne({
      where: { bagId: bag.id },
      relations: ["manifest"],
    });

    const activeParcels = (bag.bagParcels ?? []).filter((item) => item.isActive && item.parcel);

    const parcels: BagParcelItem[] = activeParcels.map((item) => ({
      id: item.parcel.id,
      trackingCode: item.parcel.trackingCode,
      recipientName: item.parcel.recipientName,
      district: item.parcel.district,
      weightKg: Number(item.parcel.weight),
      status: item.parcel.status,
      addedAt: item.createdAt.toISOString(),
    }));

    const [createdByName, sealedByName] = await Promise.all([
      this.lookupUserName(bag.createdBy),
      this.lookupUserName(bag.sealedBy),
    ]);

    return {
      ...this.toBagListItem(bag),
      notes: bag.notes,
      createdByName,
      sealedByName,
      manifestId: manifestItem?.manifestId ?? null,
      manifestCode: manifestItem?.manifest?.manifestCode ?? null,
      parcels,
    };
  }

  async addParcelToBag(
    user: AuthenticatedUser,
    bagId: string,
    trackingCode: string,
  ): Promise<{ bag: BagDetails; parcelId: string }> {
    const bag = await this.bagRepo.findOne({ where: { id: bagId } });
    if (!bag) {
      throw new NotFoundException({
        message: `Bag with ID "${bagId}" not found`,
        error: ApiErrorCode.BAG_NOT_FOUND,
      });
    }

    const hub = await this.authz.assertHubAccess(user, bag.originHubId, HubPermission.BAG_CREATE);

    const parcelId = await this.dataSource.transaction(async (manager) => {
      const parcel = await manager
        .getRepository(Parcel)
        .createQueryBuilder("parcel")
        .setLock("pessimistic_write")
        .where("parcel.tracking_code = :trackingCode", {
          trackingCode: trackingCode.trim().toUpperCase(),
        })
        .getOne();

      if (!parcel) {
        throw new NotFoundException({
          message: `Parcel "${trackingCode}" not found`,
          error: ApiErrorCode.PARCEL_NOT_FOUND,
        });
      }

      const fresh = await manager.getRepository(Bag).findOne({
        where: { id: bag.id },
        lock: { mode: "pessimistic_write" },
      });

      await this.addParcelToBagWithinTransaction(manager, bag.id, parcel, hub, user, fresh ?? bag);

      return parcel.id;
    });

    return { bag: await this.getBag(user, bagId), parcelId };
  }

  /**
   * Core bagging rules, shared by the scan workflow and the explicit
   * add-parcel endpoint:
   *  - the bag must be OPEN and belong to the origin hub
   *  - the parcel must not already be in another active bag
   *  - the destination must match the parcel's routing district when known
   */
  private async addParcelToBagWithinTransaction(
    manager: EntityManager,
    bagId: string,
    parcel: Parcel,
    hub: Hub,
    user: AuthenticatedUser,
    preselectedBag?: Bag,
  ): Promise<void> {
    const bag =
      preselectedBag ??
      (await manager.getRepository(Bag).findOne({
        where: { id: bagId },
        lock: { mode: "pessimistic_write" },
      }));

    if (!bag) {
      throw new NotFoundException({
        message: `Bag with ID "${bagId}" not found`,
        error: ApiErrorCode.BAG_NOT_FOUND,
      });
    }

    if (bag.originHubId !== hub.id) {
      throw new BadRequestException({
        message: `Bag ${bag.bagCode} belongs to another hub`,
        error: ApiErrorCode.HUB_MISMATCH,
      });
    }

    if (!OPEN_BAG_STATUSES.includes(bag.status)) {
      throw new BadRequestException({
        message: `Bag ${bag.bagCode} is ${bag.status}; parcels can only be added while it is OPEN`,
        error: ApiErrorCode.BAG_NOT_OPEN,
      });
    }

    const existingActive = await manager.getRepository(BagParcel).findOne({
      where: { parcelId: parcel.id, isActive: true },
    });

    if (existingActive) {
      if (existingActive.bagId === bag.id) {
        throw new ConflictException({
          message: `Parcel ${parcel.trackingCode} is already in bag ${bag.bagCode}`,
          error: ApiErrorCode.PARCEL_ALREADY_BAGGED,
        });
      }
      throw new ConflictException({
        message: `Parcel ${parcel.trackingCode} is already in another active bag`,
        error: ApiErrorCode.PARCEL_ALREADY_BAGGED,
      });
    }

    if (parcel.currentHubId && parcel.currentHubId !== hub.id) {
      throw new BadRequestException({
        message: `Parcel ${parcel.trackingCode} is currently at another hub`,
        error: ApiErrorCode.PARCEL_WRONG_HUB,
      });
    }

    this.lifecycle.assertTransition(parcel.status, ParcelStatus.BAGGED);

    const previousStatus = parcel.status;
    parcel.status = ParcelStatus.BAGGED;
    parcel.currentHubId = hub.id;
    await manager.getRepository(Parcel).save(parcel);

    await manager.getRepository(BagParcel).save(
      manager.getRepository(BagParcel).create({
        bagId: bag.id,
        parcelId: parcel.id,
        isActive: true,
      }),
    );

    await this.appendHistory(manager, {
      parcelId: parcel.id,
      fromStatus: previousStatus,
      toStatus: ParcelStatus.BAGGED,
      actorId: user.id,
      actorRole: user.role,
      description: `Packed into bag ${bag.bagCode} at ${hub.code}`,
      hubId: hub.id,
    });
  }

  async sealBag(user: AuthenticatedUser, bagId: string, dto: SealBagDto): Promise<BagDetails> {
    const bag = await this.bagRepo.findOne({ where: { id: bagId } });
    if (!bag) {
      throw new NotFoundException({
        message: `Bag with ID "${bagId}" not found`,
        error: ApiErrorCode.BAG_NOT_FOUND,
      });
    }

    const hub = await this.authz.assertHubAccess(user, bag.originHubId, HubPermission.BAG_SEAL);

    const updated = await this.dataSource.transaction(async (manager) => {
      const locked = await manager.getRepository(Bag).findOne({
        where: { id: bagId },
        lock: { mode: "pessimistic_write" },
      });

      if (!locked) {
        throw new NotFoundException({
          message: `Bag with ID "${bagId}" not found`,
          error: ApiErrorCode.BAG_NOT_FOUND,
        });
      }

      if (locked.status !== BagStatus.OPEN) {
        throw new BadRequestException({
          message: `Bag ${locked.bagCode} is already ${locked.status} and cannot be sealed`,
          error: ApiErrorCode.BAG_INVALID_STATE,
        });
      }

      const parcelCount = await manager.getRepository(BagParcel).count({
        where: { bagId: locked.id, isActive: true },
      });

      if (parcelCount === 0) {
        throw new BadRequestException({
          message: "A bag must contain at least one parcel before it can be sealed",
          error: ApiErrorCode.VALIDATION_ERROR,
        });
      }

      locked.status = BagStatus.SEALED;
      locked.sealTag = dto.sealTag;
      locked.sealedAt = new Date();
      locked.sealedBy = user.id;

      return manager.getRepository(Bag).save(locked);
    });

    this.logger.log(`HUB_BAG_SEALED hub=${hub.code} bag=${updated.bagCode} actor=${user.id}`);

    return this.getBag(user, bagId);
  }

  /* ================================================================== */
  /* Manifests                                                          */
  /* ================================================================== */

  async createManifest(
    user: AuthenticatedUser,
    hubIdOrCode: string,
    dto: CreateManifestDto,
  ): Promise<ManifestDetails> {
    const originHub = await this.authz.assertHubAccess(
      user,
      hubIdOrCode,
      HubPermission.MANIFEST_CREATE,
    );
    const destinationHub = await this.authz.resolveHub(dto.destinationHubId);

    if (destinationHub.id === originHub.id) {
      throw new BadRequestException({
        message: "A manifest cannot be created for its own origin hub",
        error: ApiErrorCode.VALIDATION_ERROR,
      });
    }

    const bagIds = [...new Set(dto.bagIds)];

    const manifestId = await this.dataSource.transaction(async (manager) => {
      const bags = await manager.getRepository(Bag).find({
        where: { id: In(bagIds) },
        lock: { mode: "pessimistic_write" },
      });

      if (bags.length !== bagIds.length) {
        throw new NotFoundException({
          message: "One or more selected bags no longer exist",
          error: ApiErrorCode.BAG_NOT_FOUND,
        });
      }

      for (const bag of bags) {
        if (bag.originHubId !== originHub.id) {
          throw new BadRequestException({
            message: `Bag ${bag.bagCode} does not belong to ${originHub.code}`,
            error: ApiErrorCode.HUB_MISMATCH,
          });
        }
        if (bag.status !== BagStatus.SEALED) {
          throw new BadRequestException({
            message: `Bag ${bag.bagCode} must be SEALED before it can be manifested (currently ${bag.status})`,
            error: ApiErrorCode.BAG_INVALID_STATE,
          });
        }
        if (bag.destinationHubId !== destinationHub.id) {
          throw new BadRequestException({
            message: `Bag ${bag.bagCode} is destined for another hub`,
            error: ApiErrorCode.HUB_MISMATCH,
          });
        }
      }

      const alreadyManifested = await manager.getRepository(ManifestItem).find({
        where: { bagId: In(bagIds) },
        relations: ["manifest"],
      });

      const conflicting = alreadyManifested.filter(
        (item) => item.manifest && item.manifest.status !== ManifestStatus.CANCELLED,
      );

      const conflictingItem = conflicting[0];
      if (conflictingItem) {
        throw new ConflictException({
          message: `Bag ${conflictingItem.bagId} is already assigned to an active manifest`,
          error: ApiErrorCode.MANIFEST_INVALID_STATE,
        });
      }

      const manifest = await manager.getRepository(Manifest).save(
        manager.getRepository(Manifest).create({
          manifestCode: this.generateManifestCode(),
          originHubId: originHub.id,
          destinationHubId: destinationHub.id,
          status: ManifestStatus.CREATED,
          vehicleNumber: dto.vehicleNumber,
          driverName: dto.driverName ?? null,
          driverPhone: dto.driverPhone ?? null,
          notes: dto.notes ?? null,
          createdBy: user.id,
        }),
      );

      await manager.getRepository(ManifestItem).save(
        bagIds.map((bagId) =>
          manager.getRepository(ManifestItem).create({
            manifestId: manifest.id,
            bagId,
            parcelId: null,
          }),
        ),
      );

      return manifest.id;
    });

    this.logger.log(
      `HUB_MANIFEST_CREATED origin=${originHub.code} manifest=${manifestId} bags=${bagIds.length} actor=${user.id}`,
    );

    return this.getManifest(user, manifestId);
  }

  async listManifests(
    user: AuthenticatedUser,
    hubIdOrCode: string | undefined,
  ): Promise<ManifestListItem[]> {
    const hubIds = await this.authorizedHubIdsOrThrow(user, hubIdOrCode);
    if (hubIds.length === 0) return [];

    const manifests = await this.manifestRepo
      .createQueryBuilder("manifest")
      .leftJoinAndSelect("manifest.originHub", "originHub")
      .leftJoinAndSelect("manifest.destinationHub", "destinationHub")
      .leftJoinAndSelect("manifest.items", "items")
      .leftJoinAndSelect("items.bag", "bag")
      .where(
        "(manifest.origin_hub_id IN (:...hubIds) OR manifest.destination_hub_id IN (:...hubIds))",
        { hubIds },
      )
      .orderBy("manifest.createdAt", "DESC")
      .take(200)
      .getMany();

    const parcelCounts = await this.countParcelsPerManifest(
      manifests.map((manifest) => manifest.id),
    );

    return manifests.map((manifest) =>
      this.toManifestListItem(manifest, parcelCounts.get(manifest.id) ?? 0),
    );
  }

  async getManifest(user: AuthenticatedUser, manifestId: string): Promise<ManifestDetails> {
    const manifest = await this.manifestRepo.findOne({
      where: { id: manifestId },
      relations: [
        "originHub",
        "destinationHub",
        "items",
        "items.bag",
        "items.bag.originHub",
        "items.bag.destinationHub",
        "items.bag.bagParcels",
        "items.bag.bagParcels.parcel",
      ],
    });

    if (!manifest) {
      throw new NotFoundException({
        message: `Manifest with ID "${manifestId}" not found`,
        error: ApiErrorCode.MANIFEST_NOT_FOUND,
      });
    }

    if (
      !(await this.authz.isHubVisible(user, manifest.originHubId)) &&
      !(await this.authz.isHubVisible(user, manifest.destinationHubId))
    ) {
      throw new NotFoundException({
        message: `Manifest with ID "${manifestId}" not found`,
        error: ApiErrorCode.MANIFEST_NOT_FOUND,
      });
    }

    const bags = (manifest.items ?? [])
      .map((item) => item.bag)
      .filter((bag): bag is Bag => bag !== null)
      .map((bag) => this.toBagListItem(bag));

    const parcelCount = bags.reduce((total, bag) => total + bag.parcelCount, 0);

    const [createdByName, dispatchedByName, receivedByName] = await Promise.all([
      this.lookupUserName(manifest.createdBy),
      this.lookupUserName(manifest.dispatchedBy),
      this.lookupUserName(manifest.receivedBy),
    ]);

    return {
      ...this.toManifestListItem(manifest, parcelCount),
      notes: manifest.notes,
      createdByName,
      dispatchedByName,
      receivedByName,
      bags,
      reconciliation: await this.buildReconciliation(manifest),
    };
  }

  async dispatchManifest(user: AuthenticatedUser, manifestId: string): Promise<ManifestDetails> {
    const manifest = await this.manifestRepo.findOne({
      where: { id: manifestId },
      relations: ["items", "items.bag", "originHub"],
    });

    if (!manifest) {
      throw new NotFoundException({
        message: `Manifest with ID "${manifestId}" not found`,
        error: ApiErrorCode.MANIFEST_NOT_FOUND,
      });
    }

    const hub = await this.authz.assertHubAccess(
      user,
      manifest.originHubId,
      HubPermission.MANIFEST_DISPATCH,
    );

    await this.dataSource.transaction(async (manager) => {
      const locked = await manager.getRepository(Manifest).findOne({
        where: { id: manifestId },
        lock: { mode: "pessimistic_write" },
      });

      if (!locked) {
        throw new NotFoundException({
          message: `Manifest with ID "${manifestId}" not found`,
          error: ApiErrorCode.MANIFEST_NOT_FOUND,
        });
      }

      // Guards against a double dispatch from two operators at once.
      if (locked.status !== ManifestStatus.CREATED) {
        throw new ConflictException({
          message: `Manifest ${locked.manifestCode} is already ${locked.status}`,
          error: ApiErrorCode.MANIFEST_INVALID_STATE,
        });
      }

      const destination = await manager.getRepository(Hub).findOne({
        where: { id: locked.destinationHubId },
      });
      if (!destination || destination.status !== "ACTIVE") {
        throw new BadRequestException({
          message: "Destination hub is not active and cannot accept a dispatch",
          error: ApiErrorCode.HUB_NOT_ACTIVE,
        });
      }

      const items = await manager.getRepository(ManifestItem).find({
        where: { manifestId: locked.id },
        relations: ["bag"],
      });

      if (items.length === 0) {
        throw new BadRequestException({
          message: "A manifest must contain at least one sealed bag before dispatch",
          error: ApiErrorCode.VALIDATION_ERROR,
        });
      }

      for (const item of items) {
        const bag = item.bag;
        if (!bag) continue;
        if (bag.status !== BagStatus.SEALED) {
          throw new BadRequestException({
            message: `Bag ${bag.bagCode} must be SEALED before dispatch (currently ${bag.status})`,
            error: ApiErrorCode.BAG_INVALID_STATE,
          });
        }
        await this.dispatchBagWithinTransaction(manager, bag, hub, user);
      }

      locked.status = ManifestStatus.DISPATCHED;
      locked.dispatchedAt = new Date();
      locked.dispatchedBy = user.id;
      await manager.getRepository(Manifest).save(locked);
    });

    this.logger.log(
      `HUB_MANIFEST_DISPATCHED manifest=${manifestId} hub=${hub.code} actor=${user.id}`,
    );

    return this.getManifest(user, manifestId);
  }

  /**
   * Receives a dispatched manifest at its destination hub.
   *
   * Reconciles the bags physically scanned against the manifest contents and
   * never silently accepts a mismatch: unexpected bags are rejected, missing
   * bags raise exceptions and block completion unless `allowPartial` is set.
   */
  async receiveManifest(
    user: AuthenticatedUser,
    manifestId: string,
    dto: ReceiveManifestDto,
  ): Promise<{ manifest: ManifestDetails; reconciliation: ManifestReconciliation }> {
    const manifest = await this.manifestRepo.findOne({
      where: { id: manifestId },
      relations: ["items", "items.bag"],
    });

    if (!manifest) {
      throw new NotFoundException({
        message: `Manifest with ID "${manifestId}" not found`,
        error: ApiErrorCode.MANIFEST_NOT_FOUND,
      });
    }

    const hub = await this.authz.assertHubAccess(
      user,
      manifest.destinationHubId,
      HubPermission.MANIFEST_RECEIVE,
    );

    const scanned = [...new Set(dto.scannedBagCodes.map((c) => c.trim().toUpperCase()))];
    const expectedBagCodes = new Set(
      (manifest.items ?? [])
        .map((item) => item.bag?.bagCode)
        .filter((code): code is string => typeof code === "string"),
    );

    const unexpected = scanned.filter((code) => !expectedBagCodes.has(code));

    // Reconciliation runs BEFORE the business transaction and writes its own
    // audit rows. A rejected receipt rolls the business transaction back, so
    // exceptions raised inside it would be lost — and a silently discarded
    // discrepancy is exactly what this must never do (spec §39, §41).
    const manifestItems = manifest.items ?? [];
    const missingBagCodes = [...expectedBagCodes].filter((code) => !scanned.includes(code));
    const wrongDestinationBags = manifestItems
      .map((item) => item.bag)
      .filter(
        (bag): bag is Bag =>
          bag !== null && scanned.includes(bag.bagCode) && bag.destinationHubId !== hub.id,
      );

    for (const code of unexpected) {
      await this.raiseStandaloneException({
        hubId: hub.id,
        manifestId: manifest.id,
        type: OperationalExceptionType.UNEXPECTED_BAG,
        description: `Bag ${code} was scanned while receiving manifest ${manifest.manifestCode} but is not part of it.`,
        actorId: user.id,
      });
    }

    for (const code of missingBagCodes) {
      const bag = manifestItems.find((item) => item.bag?.bagCode === code)?.bag;
      await this.raiseStandaloneException({
        hubId: hub.id,
        manifestId: manifest.id,
        bagId: bag?.id ?? null,
        type: OperationalExceptionType.MISSING_BAG,
        description: `Bag ${code} was expected on manifest ${manifest.manifestCode} but was not scanned at ${hub.code}.`,
        actorId: user.id,
      });
    }

    for (const bag of wrongDestinationBags) {
      await this.raiseStandaloneException({
        hubId: hub.id,
        manifestId: manifest.id,
        bagId: bag.id,
        type: OperationalExceptionType.WRONG_DESTINATION,
        description: `Bag ${bag.bagCode} is destined for another hub but was received at ${hub.code}.`,
        actorId: user.id,
      });
    }

    // A mismatch is never silently absorbed into the manifest.
    if (unexpected.length > 0) {
      throw new BadRequestException({
        message: `Bag(s) ${unexpected.join(", ")} are not part of manifest ${manifest.manifestCode}`,
        error: ApiErrorCode.MANIFEST_INVALID_STATE,
      });
    }

    const firstWrong = wrongDestinationBags[0];
    if (firstWrong) {
      throw new BadRequestException({
        message: `Bag ${firstWrong.bagCode} is destined for another hub`,
        error: ApiErrorCode.PARCEL_WRONG_HUB,
      });
    }

    if (missingBagCodes.length > 0 && !dto.allowPartial) {
      throw new ConflictException({
        message: `Manifest ${manifest.manifestCode} is incomplete: bag(s) ${missingBagCodes.join(
          ", ",
        )} were not scanned. Resolve the discrepancy or allow a partial receipt.`,
        error: ApiErrorCode.MANIFEST_INVALID_STATE,
      });
    }

    await this.dataSource.transaction(async (manager) => {
      const locked = await manager.getRepository(Manifest).findOne({
        where: { id: manifestId },
        lock: { mode: "pessimistic_write" },
      });

      if (!locked) {
        throw new NotFoundException({
          message: `Manifest with ID "${manifestId}" not found`,
          error: ApiErrorCode.MANIFEST_NOT_FOUND,
        });
      }

      if (!MANIFEST_IN_TRANSIT_STATUSES.includes(locked.status)) {
        throw new ConflictException({
          message: `Manifest ${locked.manifestCode} is ${locked.status} and cannot be received`,
          error: ApiErrorCode.MANIFEST_INVALID_STATE,
        });
      }

      const items = await manager.getRepository(ManifestItem).find({
        where: { manifestId: locked.id },
        relations: ["bag"],
      });

      for (const code of scanned) {
        const item = items.find((entry) => entry.bag?.bagCode === code);
        const bag = item?.bag;
        if (!bag) continue;
        await this.receiveBagWithinTransaction(manager, bag, hub, user);
      }

      locked.status =
        missingBagCodes.length > 0 ? ManifestStatus.RECONCILED : ManifestStatus.RECEIVED;
      locked.receivedAt = new Date();
      locked.receivedBy = user.id;
      await manager.getRepository(Manifest).save(locked);
    });

    this.logger.log(
      `HUB_MANIFEST_RECEIVED manifest=${manifestId} hub=${hub.code} scanned=${scanned.length}/${expectedBagCodes.size} actor=${user.id}`,
    );

    const details = await this.getManifest(user, manifestId);
    return { manifest: details, reconciliation: details.reconciliation };
  }

  /** Dispatch one sealed bag and all of its active parcels into transit. */
  private async dispatchBagWithinTransaction(
    manager: EntityManager,
    bag: Bag,
    hub: Hub,
    user: AuthenticatedUser,
  ): Promise<void> {
    const activeLinks = await manager.getRepository(BagParcel).find({
      where: { bagId: bag.id, isActive: true },
      relations: ["parcel"],
    });

    for (const link of activeLinks) {
      const parcel = link.parcel;
      if (!parcel) continue;
      this.lifecycle.assertTransition(parcel.status, ParcelStatus.IN_TRANSIT);
      const fromStatus = parcel.status;
      parcel.status = ParcelStatus.IN_TRANSIT;
      await manager.getRepository(Parcel).save(parcel);
      await this.appendHistory(manager, {
        parcelId: parcel.id,
        fromStatus,
        toStatus: ParcelStatus.IN_TRANSIT,
        actorId: user.id,
        actorRole: user.role,
        description: `Dispatched in bag ${bag.bagCode} from ${hub.code}`,
        hubId: hub.id,
      });
    }

    bag.status = BagStatus.IN_TRANSIT;
    bag.dispatchedAt = new Date();
    await manager.getRepository(Bag).save(bag);
  }

  /** Receive one bag at its destination hub and release its parcels. */
  private async receiveBagWithinTransaction(
    manager: EntityManager,
    bag: Bag,
    hub: Hub,
    user: AuthenticatedUser,
  ): Promise<void> {
    const activeLinks = await manager.getRepository(BagParcel).find({
      where: { bagId: bag.id, isActive: true },
      relations: ["parcel"],
    });

    for (const link of activeLinks) {
      const parcel = link.parcel;
      if (!parcel) continue;
      const previousStatus = parcel.status;
      if (this.lifecycle.canTransition(previousStatus, ParcelStatus.DESTINATION_HUB_RECEIVED)) {
        parcel.status = ParcelStatus.DESTINATION_HUB_RECEIVED;
      }
      parcel.currentHubId = hub.id;
      await manager.getRepository(Parcel).save(parcel);

      await this.appendHistory(manager, {
        parcelId: parcel.id,
        fromStatus: previousStatus,
        toStatus: parcel.status,
        actorId: user.id,
        actorRole: user.role,
        description: `Received in bag ${bag.bagCode} at ${hub.name} (${hub.code})`,
        hubId: hub.id,
      });

      // Release the parcel so it can be bagged again on a later leg.
      link.isActive = false;
      await manager.getRepository(BagParcel).save(link);
    }

    bag.status = BagStatus.RECEIVED;
    bag.receivedAt = new Date();
    await manager.getRepository(Bag).save(bag);
  }

  /* ================================================================== */
  /* Exceptions                                                         */
  /* ================================================================== */

  async listExceptions(
    user: AuthenticatedUser,
    hubIdOrCode: string | undefined,
    status?: ExceptionStatus,
  ): Promise<OperationalExceptionItem[]> {
    const hubIds = await this.authorizedHubIdsOrThrow(user, hubIdOrCode);
    if (hubIds.length === 0) return [];

    const exceptions = await this.exceptionRepo.find({
      where: {
        hubId: In(hubIds),
        ...(status ? { status } : {}),
      },
      order: { createdAt: "DESC" },
      take: 200,
    });

    return this.toExceptionItems(exceptions);
  }

  async resolveException(
    user: AuthenticatedUser,
    exceptionId: string,
    dto: ResolveExceptionDto,
  ): Promise<OperationalExceptionItem> {
    const exception = await this.exceptionRepo.findOne({
      where: { id: exceptionId },
    });

    if (!exception) {
      throw new NotFoundException({
        message: `Exception "${exceptionId}" not found`,
        error: ApiErrorCode.EXCEPTION_NOT_FOUND,
      });
    }

    await this.authz.assertHubAccess(user, exception.hubId, HubPermission.EXCEPTION_RESOLVE, {
      requireActive: false,
    });

    exception.status = ExceptionStatus.RESOLVED;
    exception.resolvedBy = user.id;
    exception.resolvedAt = new Date();
    exception.resolutionNote = dto.resolutionNote;
    await this.exceptionRepo.save(exception);

    const [item] = await this.toExceptionItems([exception]);
    if (!item) {
      throw new InternalServerErrorException("Failed to serialize exception");
    }
    return item;
  }

  /* ================================================================== */
  /* Helpers                                                            */
  /* ================================================================== */

  /** Resolve the hub scope for a list query, asserting authorization when scoped. */
  private async authorizedHubIdsOrThrow(
    user: AuthenticatedUser,
    hubIdOrCode: string | undefined,
  ): Promise<string[]> {
    if (hubIdOrCode) {
      const hub = await this.authz.assertHubAccess(user, hubIdOrCode, HubPermission.VIEW, {
        requireActive: false,
      });
      return [hub.id];
    }
    return this.authz.listAuthorizedHubIds(user);
  }

  private async assertBagVisible(user: AuthenticatedUser, bag: Bag): Promise<void> {
    const [originVisible, destinationVisible] = await Promise.all([
      this.authz.isHubVisible(user, bag.originHubId),
      this.authz.isHubVisible(user, bag.destinationHubId),
    ]);

    if (!originVisible && !destinationVisible) {
      // 404 rather than 403 so an unauthorized actor cannot probe for bag ids.
      throw new NotFoundException({
        message: `Bag with ID "${bag.id}" not found`,
        error: ApiErrorCode.BAG_NOT_FOUND,
      });
    }
  }

  private async appendHistory(
    manager: EntityManager,
    entry: {
      parcelId: string;
      fromStatus: ParcelStatus | null;
      toStatus: ParcelStatus;
      actorId: string;
      actorRole: string;
      description: string;
      hubId?: string | null;
    },
  ): Promise<void> {
    await manager.getRepository(ParcelStatusHistory).save(
      manager.getRepository(ParcelStatusHistory).create({
        parcelId: entry.parcelId,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        eventType: "STATUS_CHANGED",
        actorId: entry.actorId,
        actorRole: entry.actorRole,
        description: entry.description,
        metadata: entry.hubId ? { hubId: entry.hubId } : {},
      }),
    );
  }

  private async persistScan(
    manager: EntityManager,
    scan: {
      parcelId: string | null;
      bagId: string | null;
      hubId: string;
      scanType: HubScanType;
      outcome: ScanOutcome;
      reasonCode: string | null;
      barcode: string;
      operatorId: string;
      idempotencyKey: string | null;
      notes: string | null;
    },
  ): Promise<ParcelScan> {
    return manager.getRepository(ParcelScan).save(manager.getRepository(ParcelScan).create(scan));
  }

  /**
   * Persists a rejected attempt in its own write so the audit trail survives
   * the failed business transaction.
   */
  private async recordRejectedScan(
    hub: Hub,
    barcode: string,
    dto: HubScanDto,
    user: AuthenticatedUser,
    error: unknown,
  ): Promise<void> {
    const reasonCode =
      (error as { response?: { error?: string } })?.response?.error ?? "SCAN_REJECTED";

    try {
      await this.scanRepo.save(
        this.scanRepo.create({
          parcelId: null,
          bagId: dto.bagId ?? null,
          hubId: hub.id,
          scanType: dto.scanType,
          outcome: ScanOutcome.REJECTED,
          reasonCode,
          barcode,
          operatorId: user.id,
          idempotencyKey: dto.idempotencyKey ?? null,
          notes: dto.notes ?? null,
        }),
      );
    } catch (persistError) {
      // Never mask the original failure with an audit-write problem.
      this.logger.warn(
        `Failed to record rejected scan for ${barcode}: ${
          persistError instanceof Error ? persistError.message : "unknown"
        }`,
      );
    }
  }

  /**
   * Persists an exception in its own write, independent of any surrounding
   * transaction. Used for discrepancies discovered while rejecting an
   * operation, where the business transaction is rolled back.
   */
  private async raiseStandaloneException(exception: {
    hubId: string;
    parcelId?: string | null;
    bagId?: string | null;
    manifestId?: string | null;
    type: OperationalExceptionType;
    description: string;
    actorId: string;
  }): Promise<OperationalException> {
    return this.exceptionRepo.save(
      this.exceptionRepo.create({
        hubId: exception.hubId,
        parcelId: exception.parcelId ?? null,
        bagId: exception.bagId ?? null,
        manifestId: exception.manifestId ?? null,
        type: exception.type,
        status: ExceptionStatus.OPEN,
        description: exception.description,
        actorId: exception.actorId,
      }),
    );
  }

  private async raiseException(
    manager: EntityManager,
    exception: {
      hubId: string;
      parcelId?: string | null;
      bagId?: string | null;
      manifestId?: string | null;
      type: OperationalExceptionType;
      description: string;
      actorId: string;
    },
  ): Promise<OperationalException> {
    return manager.getRepository(OperationalException).save(
      manager.getRepository(OperationalException).create({
        hubId: exception.hubId,
        parcelId: exception.parcelId ?? null,
        bagId: exception.bagId ?? null,
        manifestId: exception.manifestId ?? null,
        type: exception.type,
        status: ExceptionStatus.OPEN,
        description: exception.description,
        actorId: exception.actorId,
      }),
    );
  }

  private async lookupUserName(userId: string | null): Promise<string | null> {
    if (!userId) return null;
    const user = await this.parcelRepo.manager.getRepository(User).findOne({
      where: { id: userId },
      select: ["id", "name"],
    });
    return user?.name ?? null;
  }

  private async toExceptionItems(
    exceptions: OperationalException[],
  ): Promise<OperationalExceptionItem[]> {
    if (exceptions.length === 0) return [];

    const hubIds = [...new Set(exceptions.map((e) => e.hubId))];
    const parcelIds = [
      ...new Set(exceptions.map((e) => e.parcelId).filter((id): id is string => id !== null)),
    ];
    const bagIds = [
      ...new Set(exceptions.map((e) => e.bagId).filter((id): id is string => id !== null)),
    ];
    const manifestIds = [
      ...new Set(exceptions.map((e) => e.manifestId).filter((id): id is string => id !== null)),
    ];
    const userIds = [
      ...new Set(
        exceptions
          .flatMap((e) => [e.actorId, e.resolvedBy])
          .filter((id): id is string => id !== null),
      ),
    ];

    const [hubs, parcels, bags, manifests, users] = await Promise.all([
      this.hubRepo.find({ where: { id: In(hubIds) } }),
      parcelIds.length
        ? this.parcelRepo.find({
            where: { id: In(parcelIds) },
            select: ["id", "trackingCode"],
          })
        : Promise.resolve([]),
      bagIds.length
        ? this.bagRepo.find({
            where: { id: In(bagIds) },
            select: ["id", "bagCode"],
          })
        : Promise.resolve([]),
      manifestIds.length
        ? this.manifestRepo.find({
            where: { id: In(manifestIds) },
            select: ["id", "manifestCode"],
          })
        : Promise.resolve([]),
      userIds.length
        ? this.parcelRepo.manager.getRepository(User).find({
            where: { id: In(userIds) },
            select: ["id", "name"],
          })
        : Promise.resolve([]),
    ]);

    const hubById = new Map(hubs.map((h) => [h.id, h]));
    const parcelById = new Map(parcels.map((p) => [p.id, p.trackingCode]));
    const bagById = new Map(bags.map((b) => [b.id, b.bagCode]));
    const manifestById = new Map(manifests.map((m) => [m.id, m.manifestCode]));
    const userById = new Map(users.map((u) => [u.id, u.name]));

    return exceptions.map((exception) => {
      const hub = hubById.get(exception.hubId);
      return {
        id: exception.id,
        type: exception.type,
        status: exception.status,
        description: exception.description,
        hubCode: hub?.code ?? "",
        hubName: hub?.name ?? "",
        trackingCode: exception.parcelId ? (parcelById.get(exception.parcelId) ?? null) : null,
        bagCode: exception.bagId ? (bagById.get(exception.bagId) ?? null) : null,
        manifestCode: exception.manifestId
          ? (manifestById.get(exception.manifestId) ?? null)
          : null,
        raisedByName: exception.actorId ? (userById.get(exception.actorId) ?? null) : null,
        resolvedByName: exception.resolvedBy ? (userById.get(exception.resolvedBy) ?? null) : null,
        resolvedAt: exception.resolvedAt?.toISOString() ?? null,
        resolutionNote: exception.resolutionNote,
        createdAt: exception.createdAt.toISOString(),
      };
    });
  }

  /** Expected manifest contents versus what the destination hub has received. */
  private async buildReconciliation(manifest: Manifest): Promise<ManifestReconciliation> {
    const items = await this.manifestItemRepo.find({
      where: { manifestId: manifest.id },
      relations: ["bag", "bag.bagParcels", "bag.bagParcels.parcel"],
    });

    const expectedBagCodes: string[] = [];
    const receivedBagCodes: string[] = [];
    const expectedTrackingCodes: string[] = [];
    const receivedTrackingCodes: string[] = [];

    for (const item of items) {
      const bag = item.bag;
      if (!bag) continue;
      expectedBagCodes.push(bag.bagCode);

      const parcels = (bag.bagParcels ?? []).filter((link) => link.parcel);
      for (const link of parcels) {
        expectedTrackingCodes.push(link.parcel.trackingCode);
        const arrived =
          link.parcel.currentHubId === manifest.destinationHubId &&
          (link.parcel.status === ParcelStatus.DESTINATION_HUB_RECEIVED ||
            link.parcel.status === ParcelStatus.ASSIGNED_TO_RIDER ||
            link.parcel.status === ParcelStatus.OUT_FOR_DELIVERY ||
            link.parcel.status === ParcelStatus.DELIVERED);
        if (arrived) {
          receivedTrackingCodes.push(link.parcel.trackingCode);
        }
      }

      if (bag.status === BagStatus.RECEIVED || bag.status === BagStatus.COMPLETED) {
        receivedBagCodes.push(bag.bagCode);
      }
    }

    const missingBagCodes = expectedBagCodes.filter((code) => !receivedBagCodes.includes(code));

    return {
      expectedBagCount: expectedBagCodes.length,
      receivedBagCount: receivedBagCodes.length,
      expectedParcelCount: expectedTrackingCodes.length,
      receivedParcelCount: receivedTrackingCodes.length,
      missingBagCodes,
      unexpectedBagCodes: [],
      missingTrackingCodes: expectedTrackingCodes.filter(
        (code) => !receivedTrackingCodes.includes(code),
      ),
      unexpectedTrackingCodes: [],
      isComplete: missingBagCodes.length === 0 && receivedBagCodes.length > 0,
    };
  }

  private async countParcelsPerManifest(manifestIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (manifestIds.length === 0) return counts;

    const rows = await this.bagParcelRepo
      .createQueryBuilder("bagParcel")
      .innerJoin("bagParcel.bag", "bag")
      .innerJoin("manifest_items", "item", "item.bag_id = bag.id")
      .where("item.manifest_id IN (:...manifestIds)", { manifestIds })
      .andWhere("bagParcel.is_active = true")
      .select("item.manifest_id", "manifestId")
      .addSelect("COUNT(bagParcel.id)", "count")
      .groupBy("item.manifest_id")
      .getRawMany<{ manifestId: string; count: string }>();

    for (const row of rows) {
      counts.set(row.manifestId, Number(row.count));
    }
    return counts;
  }

  private resultFromScan(
    scan: ParcelScan,
    hub: Hub,
    override: Partial<HubScanResult> & {
      outcome: ScanOutcome;
      currentStatus: string;
      message: string;
    },
  ): HubScanResult {
    return {
      ...override,
      success: override.outcome === ScanOutcome.APPLIED,
      scanType: scan.scanType,
      barcode: scan.barcode,
      itemType: override.itemType ?? (scan.bagId ? "BAG" : "PARCEL"),
      reasonCode: override.reasonCode ?? scan.reasonCode ?? undefined,
      routingInfo: {
        currentHubName: hub.name,
        ...(override.routingInfo ?? {}),
      },
      timestamp: scan.createdAt.toISOString(),
    };
  }

  private appliedMessage(scanType: HubScanType, parcel: Parcel, hub: Hub): string {
    switch (scanType) {
      case HubScanType.RECEIVE_INBOUND:
        return `Parcel ${parcel.trackingCode} received at ${hub.name}`;
      case HubScanType.BAG_PARCEL:
        return `Parcel ${parcel.trackingCode} bagged`;
      case HubScanType.RECEIVE_TRANSFER:
        return `Parcel ${parcel.trackingCode} received at destination hub ${hub.name}`;
      case HubScanType.SORT:
      default:
        return `Parcel ${parcel.trackingCode} verified at ${hub.name}`;
    }
  }

  private toHubSummary(hub: Hub) {
    return {
      id: hub.id,
      code: hub.code,
      name: hub.name,
      type: hub.type,
      status: hub.status,
      district: hub.district,
      thana: hub.thana,
      address: hub.address,
    };
  }

  private toBagListItem(bag: Bag): BagListItem {
    const activeLinks = (bag.bagParcels ?? []).filter((link) => link.isActive);

    return {
      id: bag.id,
      bagCode: bag.bagCode,
      originHubCode: bag.originHub?.code ?? "",
      originHubName: bag.originHub?.name ?? "",
      destinationHubCode: bag.destinationHub?.code ?? "",
      destinationHubName: bag.destinationHub?.name ?? "",
      status: bag.status,
      sealTag: bag.sealTag,
      parcelCount: activeLinks.length,
      totalWeightKg: activeLinks.reduce(
        (total, link) => total + Number(link.parcel?.weight ?? 0),
        0,
      ),
      createdAt: bag.createdAt.toISOString(),
      sealedAt: bag.sealedAt?.toISOString() ?? null,
      dispatchedAt: bag.dispatchedAt?.toISOString() ?? null,
      receivedAt: bag.receivedAt?.toISOString() ?? null,
    };
  }

  private toManifestListItem(manifest: Manifest, parcelCount: number): ManifestListItem {
    const bags = (manifest.items ?? [])
      .map((item) => item.bag)
      .filter((bag): bag is Bag => bag !== null);

    return {
      id: manifest.id,
      manifestCode: manifest.manifestCode,
      originHubCode: manifest.originHub?.code ?? "",
      originHubName: manifest.originHub?.name ?? "",
      destinationHubCode: manifest.destinationHub?.code ?? "",
      destinationHubName: manifest.destinationHub?.name ?? "",
      status: manifest.status,
      vehicleNumber: manifest.vehicleNumber,
      driverName: manifest.driverName,
      driverPhone: manifest.driverPhone,
      bagCount: bags.length > 0 ? bags.length : (manifest.items ?? []).length,
      parcelCount,
      createdAt: manifest.createdAt.toISOString(),
      dispatchedAt: manifest.dispatchedAt?.toISOString() ?? null,
      receivedAt: manifest.receivedAt?.toISOString() ?? null,
    };
  }

  private generateBagCode(originCode: string, destinationCode: string): string {
    return `BAG-${originCode}-${destinationCode}-${randomUUID().slice(0, 6).toUpperCase()}`;
  }

  private generateManifestCode(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `MAN-${dateStr}-${randomUUID().slice(0, 6).toUpperCase()}`;
  }
}
