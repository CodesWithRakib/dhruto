import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomUUID } from "node:crypto";
import {
  Hub,
  HubStatus,
  Bag,
  BagStatus,
  BagParcel,
  Manifest,
  ManifestStatus,
  Parcel,
  ParcelStatus,
  ParcelStatusHistory,
} from "../database/entities/index.js";
import {
  CreateBagDto,
  SealBagDto,
  CreateManifestDto,
  HubScanDto,
  HubScanType,
  type HubScanResult,
} from "@dhruto/contracts";

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
    @InjectRepository(Parcel)
    private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(ParcelStatusHistory)
    private readonly statusHistoryRepo: Repository<ParcelStatusHistory>,
  ) {}

  /**
   * Retrieves all operational hubs.
   */
  async getAllHubs(): Promise<Hub[]> {
    return this.hubRepo.find({
      where: { status: HubStatus.ACTIVE },
      order: { name: "ASC" },
    });
  }

  /**
   * Retrieves a single hub by ID or code.
   */
  async getHubById(idOrCode: string): Promise<Hub> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCode);
    const where = isUuid ? { id: idOrCode } : { code: idOrCode };

    const hub = await this.hubRepo.findOne({ where });
    if (!hub) {
      throw new NotFoundException(`Hub not found: ${idOrCode}`);
    }
    return hub;
  }

  /**
   * Computes live inventory statistics and counts of parcels currently at this hub.
   */
  async getHubInventory(hubId: string) {
    const hub = await this.getHubById(hubId);

    const parcelsAtHub = await this.parcelRepo.find({
      where: [
        { currentHubId: hub.id },
        { currentHubId: undefined, status: ParcelStatus.CREATED },
      ],
      order: { updatedAt: "DESC" },
    });

    let inboundCount = 0;
    let receivedCount = 0;
    let baggedCount = 0;
    let outForDeliveryCount = 0;

    for (const p of parcelsAtHub) {
      if (p.status === ParcelStatus.CREATED || p.status === ParcelStatus.PICKED_UP) {
        inboundCount++;
      } else if (p.status === ParcelStatus.ORIGIN_HUB_RECEIVED || p.status === ParcelStatus.DESTINATION_HUB_RECEIVED) {
        receivedCount++;
      } else if (p.status === ParcelStatus.BAGGED) {
        baggedCount++;
      } else if (p.status === ParcelStatus.ASSIGNED_TO_RIDER || p.status === ParcelStatus.OUT_FOR_DELIVERY) {
        outForDeliveryCount++;
      }
    }

    const openBags = await this.bagRepo.find({
      where: { originHubId: hub.id, status: BagStatus.OPEN },
      relations: ["destinationHub"],
    });

    return {
      hub: {
        id: hub.id,
        code: hub.code,
        name: hub.name,
        address: hub.address,
      },
      counts: {
        inboundCount,
        receivedCount,
        baggedCount,
        outForDeliveryCount,
        openBagsCount: openBags.length,
      },
      openBags: openBags.map((b) => ({
        id: b.id,
        bagCode: b.bagCode,
        destinationHub: b.destinationHub?.name,
        status: b.status,
      })),
      parcels: parcelsAtHub.slice(0, 50).map((p) => ({
        id: p.id,
        trackingCode: p.trackingCode,
        recipientName: p.recipientName,
        recipientPhone: p.recipientPhone,
        district: (p.normalizedAddress as any)?.district,
        codAmount: Number(p.codAmount),
        status: p.status,
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  }

  /**
   * Barcode Scan Engine: Processes handheld or camera barcode scans.
   */
  async scanBarcode(
    hubId: string,
    dto: HubScanDto,
    userId: string,
    role: string = "HUB_MANAGER",
  ): Promise<HubScanResult> {
    const hub = await this.getHubById(hubId);
    const barcode = dto.barcode.trim().toUpperCase();

    // Check if barcode represents a Bag
    if (barcode.startsWith("BAG-")) {
      return this.processBagScan(hub, barcode, dto, userId, role);
    }

    // Otherwise process as a Parcel
    const parcel = await this.parcelRepo.findOne({
      where: { trackingCode: barcode },
      relations: ["currentHub"],
    });

    if (!parcel) {
      throw new NotFoundException(`Parcel with tracking code "${barcode}" not found`);
    }

    const previousStatus = parcel.status;

    switch (dto.scanType) {
      case HubScanType.RECEIVE_INBOUND: {
        // Allowed from CREATED, PICKUP_REQUESTED, PICKUP_ASSIGNED, PICKED_UP
        parcel.currentHubId = hub.id;
        parcel.status = ParcelStatus.ORIGIN_HUB_RECEIVED;
        await this.parcelRepo.save(parcel);

        await this.recordStatusHistory(
          parcel.id,
          previousStatus,
          ParcelStatus.ORIGIN_HUB_RECEIVED,
          userId,
          role,
          `Inbound parcel scanned into ${hub.name} (${hub.code})`,
          hub.id,
        );

        return {
          success: true,
          scanType: dto.scanType,
          barcode: parcel.trackingCode,
          itemType: "PARCEL",
          previousStatus,
          currentStatus: parcel.status,
          message: `Parcel received at ${hub.name}`,
          routingInfo: {
            currentHubName: hub.name,
            destinationHubName: (parcel.normalizedAddress as any)?.district,
          },
          timestamp: new Date().toISOString(),
        };
      }

      case HubScanType.BAG_PARCEL: {
        if (!dto.bagId) {
          throw new BadRequestException("bagId is required when scanning for BAG_PARCEL");
        }
        const bag = await this.bagRepo.findOne({
          where: { id: dto.bagId },
          relations: ["destinationHub"],
        });
        if (!bag) {
          throw new NotFoundException("Selected transit bag not found");
        }
        if (bag.status !== BagStatus.OPEN) {
          throw new BadRequestException(`Cannot add parcel to bag in status "${bag.status}". Bag must be OPEN.`);
        }

        // Add relation
        const existing = await this.bagParcelRepo.findOne({
          where: { bagId: bag.id, parcelId: parcel.id },
        });
        if (!existing) {
          const bp = this.bagParcelRepo.create({
            bagId: bag.id,
            parcelId: parcel.id,
          });
          await this.bagParcelRepo.save(bp);
        }

        parcel.status = ParcelStatus.BAGGED;
        await this.parcelRepo.save(parcel);

        await this.recordStatusHistory(
          parcel.id,
          previousStatus,
          ParcelStatus.BAGGED,
          userId,
          role,
          `Packed into bag ${bag.bagCode} for ${bag.destinationHub?.name || "destination"}`,
          hub.id,
        );

        return {
          success: true,
          scanType: dto.scanType,
          barcode: parcel.trackingCode,
          itemType: "PARCEL",
          previousStatus,
          currentStatus: parcel.status,
          message: `Parcel bagged into ${bag.bagCode}`,
          routingInfo: {
            destinationHubName: bag.destinationHub?.name,
          },
          timestamp: new Date().toISOString(),
        };
      }

      case HubScanType.RECEIVE_TRANSFER: {
        parcel.currentHubId = hub.id;
        parcel.status = ParcelStatus.DESTINATION_HUB_RECEIVED;
        await this.parcelRepo.save(parcel);

        await this.recordStatusHistory(
          parcel.id,
          previousStatus,
          ParcelStatus.DESTINATION_HUB_RECEIVED,
          userId,
          role,
          `Arrived at destination hub ${hub.name}`,
          hub.id,
        );

        return {
          success: true,
          scanType: dto.scanType,
          barcode: parcel.trackingCode,
          itemType: "PARCEL",
          previousStatus,
          currentStatus: parcel.status,
          message: `Parcel received at destination hub ${hub.name}`,
          routingInfo: {
            currentHubName: hub.name,
          },
          timestamp: new Date().toISOString(),
        };
      }

      case HubScanType.SORT:
      default: {
        return {
          success: true,
          scanType: dto.scanType,
          barcode: parcel.trackingCode,
          itemType: "PARCEL",
          previousStatus,
          currentStatus: parcel.status,
          message: `Parcel sorted. Destination: ${(parcel.normalizedAddress as any)?.district || "Dhaka"}`,
          routingInfo: {
            destinationHubName: (parcel.normalizedAddress as any)?.district || "Dhaka",
          },
          timestamp: new Date().toISOString(),
        };
      }
    }
  }

  /**
   * Processes a Bag barcode scan (e.g. receiving a transfer bag).
   */
  private async processBagScan(
    hub: Hub,
    barcode: string,
    dto: HubScanDto,
    userId: string,
    role: string,
  ): Promise<HubScanResult> {
    const bag = await this.bagRepo.findOne({
      where: { bagCode: barcode },
      relations: ["originHub", "destinationHub"],
    });

    if (!bag) {
      throw new NotFoundException(`Bag with code "${barcode}" not found`);
    }

    const previousStatus = bag.status;

    if (dto.scanType === HubScanType.RECEIVE_TRANSFER) {
      bag.status = BagStatus.RECEIVED;
      bag.receivedAt = new Date();
      await this.bagRepo.save(bag);

      // Transition all enclosed parcels to DESTINATION_HUB_RECEIVED
      const bagParcels = await this.bagParcelRepo.find({
        where: { bagId: bag.id },
        relations: ["parcel"],
      });

      for (const bp of bagParcels) {
        if (bp.parcel) {
          const fromStatus = bp.parcel.status;
          bp.parcel.status = ParcelStatus.DESTINATION_HUB_RECEIVED;
          bp.parcel.currentHubId = hub.id;
          await this.parcelRepo.save(bp.parcel);

          await this.recordStatusHistory(
            bp.parcel.id,
            fromStatus,
            ParcelStatus.DESTINATION_HUB_RECEIVED,
            userId,
            role,
            `Unbagged from transit bag ${bag.bagCode} at ${hub.name}`,
            hub.id,
          );
        }
      }

      return {
        success: true,
        scanType: dto.scanType,
        barcode: bag.bagCode,
        itemType: "BAG",
        previousStatus,
        currentStatus: bag.status,
        message: `Bag ${bag.bagCode} received and ${bagParcels.length} parcels unpacked at ${hub.name}`,
        routingInfo: {
          originHubName: bag.originHub?.name,
          destinationHubName: hub.name,
        },
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      scanType: dto.scanType,
      barcode: bag.bagCode,
      itemType: "BAG",
      previousStatus,
      currentStatus: bag.status,
      message: `Bag verified: ${bag.bagCode}`,
      routingInfo: {
        originHubName: bag.originHub?.name,
        destinationHubName: bag.destinationHub?.name,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ==================== BAG WORKFLOWS ====================

  /**
   * Creates a new transit bag at the origin hub.
   */
  async createBag(originHubId: string, dto: CreateBagDto, _userId?: string): Promise<Bag> {
    const originHub = await this.getHubById(originHubId);
    const destHub = await this.getHubById(dto.destinationHubId);

    const randomHex = randomUUID().slice(0, 6).toUpperCase();
    const bagCode = `BAG-${originHub.code}-${destHub.code}-${randomHex}`;

    const bag = this.bagRepo.create({
      bagCode,
      originHubId: originHub.id,
      destinationHubId: destHub.id,
      status: BagStatus.OPEN,
      sealTag: dto.sealTag || null,
    });

    await this.bagRepo.save(bag);
    bag.originHub = originHub;
    bag.destinationHub = destHub;

    this.logger.log(`Created transit bag ${bag.bagCode} from ${originHub.code} to ${destHub.code}`);
    return bag;
  }

  /**
   * Lists bags with optional filtering by hub or status.
   */
  async getBags(options?: { hubId?: string; status?: BagStatus }) {
    const query = this.bagRepo
      .createQueryBuilder("bag")
      .leftJoinAndSelect("bag.originHub", "originHub")
      .leftJoinAndSelect("bag.destinationHub", "destinationHub")
      .leftJoinAndSelect("bag.bagParcels", "bagParcels")
      .orderBy("bag.createdAt", "DESC");

    if (options?.hubId) {
      query.andWhere("(bag.originHubId = :hubId OR bag.destinationHubId = :hubId)", {
        hubId: options.hubId,
      });
    }

    if (options?.status) {
      query.andWhere("bag.status = :status", { status: options.status });
    }

    const bags = await query.getMany();

    return bags.map((b) => ({
      id: b.id,
      bagCode: b.bagCode,
      originHub: b.originHub?.name,
      destinationHub: b.destinationHub?.name,
      status: b.status,
      sealTag: b.sealTag,
      parcelCount: b.bagParcels?.length || 0,
      sealedAt: b.sealedAt?.toISOString() || null,
      dispatchedAt: b.dispatchedAt?.toISOString() || null,
      receivedAt: b.receivedAt?.toISOString() || null,
      createdAt: b.createdAt.toISOString(),
    }));
  }

  /**
   * Retrieves single bag details with list of all enclosed parcels.
   */
  async getBagById(bagId: string) {
    const bag = await this.bagRepo.findOne({
      where: { id: bagId },
      relations: ["originHub", "destinationHub", "bagParcels", "bagParcels.parcel"],
    });

    if (!bag) {
      throw new NotFoundException(`Bag with ID "${bagId}" not found`);
    }

    return {
      id: bag.id,
      bagCode: bag.bagCode,
      originHub: bag.originHub,
      destinationHub: bag.destinationHub,
      status: bag.status,
      sealTag: bag.sealTag,
      sealedAt: bag.sealedAt?.toISOString() || null,
      dispatchedAt: bag.dispatchedAt?.toISOString() || null,
      receivedAt: bag.receivedAt?.toISOString() || null,
      parcels: (bag.bagParcels || []).map((bp) => ({
        id: bp.parcel?.id,
        trackingCode: bp.parcel?.trackingCode,
        recipientName: bp.parcel?.recipientName,
        recipientPhone: bp.parcel?.recipientPhone,
        weight: Number(bp.parcel?.weight),
        codAmount: Number(bp.parcel?.codAmount),
        status: bp.parcel?.status,
      })),
    };
  }

  /**
   * Adds a parcel into an OPEN bag.
   */
  async addParcelToBag(bagId: string, trackingCode: string, userId: string, role = "HUB_MANAGER") {
    const bag = await this.bagRepo.findOne({
      where: { id: bagId },
      relations: ["destinationHub"],
    });

    if (!bag) {
      throw new NotFoundException("Bag not found");
    }

    if (bag.status !== BagStatus.OPEN) {
      throw new BadRequestException(`Cannot add parcels to bag in status "${bag.status}". Bag must be OPEN.`);
    }

    const parcel = await this.parcelRepo.findOne({ where: { trackingCode } });
    if (!parcel) {
      throw new NotFoundException(`Parcel "${trackingCode}" not found`);
    }

    const previousStatus = parcel.status;
    parcel.status = ParcelStatus.BAGGED;
    await this.parcelRepo.save(parcel);

    const bp = this.bagParcelRepo.create({
      bagId: bag.id,
      parcelId: parcel.id,
    });
    await this.bagParcelRepo.save(bp);

    await this.recordStatusHistory(
      parcel.id,
      previousStatus,
      ParcelStatus.BAGGED,
      userId,
      role,
      `Packed into bag ${bag.bagCode}`,
      bag.originHubId,
    );

    return {
      success: true,
      message: `Parcel ${parcel.trackingCode} added to bag ${bag.bagCode}`,
      bagId: bag.id,
      trackingCode: parcel.trackingCode,
    };
  }

  /**
   * Seals a bag with a tamper-evident seal tag.
   */
  async sealBag(bagId: string, dto: SealBagDto, _userId?: string) {
    const bag = await this.bagRepo.findOne({ where: { id: bagId } });
    if (!bag) {
      throw new NotFoundException("Bag not found");
    }

    if (bag.status !== BagStatus.OPEN) {
      throw new BadRequestException(`Bag is already in status "${bag.status}".`);
    }

    bag.status = BagStatus.SEALED;
    bag.sealTag = dto.sealTag;
    bag.sealedAt = new Date();
    await this.bagRepo.save(bag);

    this.logger.log(`Bag ${bag.bagCode} sealed with tag ${bag.sealTag}`);

    return {
      success: true,
      message: `Bag ${bag.bagCode} sealed successfully`,
      bag,
    };
  }

  /**
   * Dispatches a bag: transitions bag and all enclosed parcels to IN_TRANSIT.
   */
  async dispatchBag(bagId: string, userId: string, role = "HUB_MANAGER") {
    const bag = await this.bagRepo.findOne({
      where: { id: bagId },
      relations: ["originHub", "destinationHub", "bagParcels", "bagParcels.parcel"],
    });

    if (!bag) {
      throw new NotFoundException("Bag not found");
    }

    bag.status = BagStatus.IN_TRANSIT;
    bag.dispatchedAt = new Date();
    await this.bagRepo.save(bag);

    for (const bp of bag.bagParcels || []) {
      if (bp.parcel) {
        const fromStatus = bp.parcel.status;
        bp.parcel.status = ParcelStatus.IN_TRANSIT;
        await this.parcelRepo.save(bp.parcel);

        await this.recordStatusHistory(
          bp.parcel.id,
          fromStatus,
          ParcelStatus.IN_TRANSIT,
          userId,
          role,
          `Dispatched in transit bag ${bag.bagCode} to ${bag.destinationHub?.name}`,
          bag.originHubId,
        );
      }
    }

    this.logger.log(`Bag ${bag.bagCode} dispatched in transit`);

    return {
      success: true,
      message: `Bag ${bag.bagCode} and ${(bag.bagParcels || []).length} parcels dispatched`,
      bag,
    };
  }

  /**
   * Receives a bag at destination hub: unpacks and transitions all parcels to DESTINATION_HUB_RECEIVED.
   */
  async receiveBag(bagId: string, destinationHubId: string, userId: string, role = "HUB_MANAGER") {
    const bag = await this.bagRepo.findOne({
      where: { id: bagId },
      relations: ["originHub", "destinationHub", "bagParcels", "bagParcels.parcel"],
    });

    if (!bag) {
      throw new NotFoundException("Bag not found");
    }

    const hub = await this.getHubById(destinationHubId);

    bag.status = BagStatus.RECEIVED;
    bag.receivedAt = new Date();
    await this.bagRepo.save(bag);

    for (const bp of bag.bagParcels || []) {
      if (bp.parcel) {
        const fromStatus = bp.parcel.status;
        bp.parcel.status = ParcelStatus.DESTINATION_HUB_RECEIVED;
        bp.parcel.currentHubId = hub.id;
        await this.parcelRepo.save(bp.parcel);

        await this.recordStatusHistory(
          bp.parcel.id,
          fromStatus,
          ParcelStatus.DESTINATION_HUB_RECEIVED,
          userId,
          role,
          `Arrived and unbagged at destination hub ${hub.name}`,
          hub.id,
        );
      }
    }

    this.logger.log(`Bag ${bag.bagCode} received at ${hub.name}`);

    return {
      success: true,
      message: `Bag ${bag.bagCode} received at ${hub.name}. ${(bag.bagParcels || []).length} parcels ready for rider assignment.`,
      bag,
    };
  }

  // ==================== MANIFEST WORKFLOWS ====================

  /**
   * Creates a transit manifest for a group of sealed bags and transport vehicle.
   */
  async createManifest(originHubId: string, dto: CreateManifestDto, _userId?: string) {
    const originHub = await this.getHubById(originHubId);
    const destHub = await this.getHubById(dto.destinationHubId);

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = randomUUID().slice(0, 6).toUpperCase();
    const manifestCode = `MAN-${dateStr}-${randomHex}`;

    const manifest = this.manifestRepo.create({
      manifestCode,
      originHubId: originHub.id,
      destinationHubId: destHub.id,
      vehicleNumber: dto.vehicleNumber,
      driverName: dto.driverName,
      driverPhone: dto.driverPhone,
      bagIds: dto.bagIds,
      status: ManifestStatus.CREATED,
    });

    await this.manifestRepo.save(manifest);
    manifest.originHub = originHub;
    manifest.destinationHub = destHub;

    return manifest;
  }

  /**
   * Lists manifests with hub relationships.
   */
  async getManifests(options?: { hubId?: string }) {
    const query = this.manifestRepo
      .createQueryBuilder("man")
      .leftJoinAndSelect("man.originHub", "originHub")
      .leftJoinAndSelect("man.destinationHub", "destinationHub")
      .orderBy("man.createdAt", "DESC");

    if (options?.hubId) {
      query.andWhere("(man.originHubId = :hubId OR man.destinationHubId = :hubId)", {
        hubId: options.hubId,
      });
    }

    const manifests = await query.getMany();

    return manifests.map((m) => ({
      id: m.id,
      manifestCode: m.manifestCode,
      originHub: m.originHub?.name,
      destinationHub: m.destinationHub?.name,
      vehicleNumber: m.vehicleNumber,
      driverName: m.driverName,
      driverPhone: m.driverPhone,
      bagCount: m.bagIds?.length || 0,
      status: m.status,
      dispatchedAt: m.dispatchedAt?.toISOString() || null,
      receivedAt: m.receivedAt?.toISOString() || null,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  /**
   * Dispatches a manifest and all its linked bags simultaneously.
   */
  async dispatchManifest(manifestId: string, userId: string) {
    const manifest = await this.manifestRepo.findOne({
      where: { id: manifestId },
      relations: ["originHub", "destinationHub"],
    });

    if (!manifest) {
      throw new NotFoundException("Manifest not found");
    }

    manifest.status = ManifestStatus.DISPATCHED;
    manifest.dispatchedAt = new Date();
    await this.manifestRepo.save(manifest);

    // Dispatch all associated bags
    for (const bagId of manifest.bagIds) {
      await this.dispatchBag(bagId, userId);
    }

    return {
      success: true,
      message: `Manifest ${manifest.manifestCode} dispatched with ${manifest.bagIds.length} bags`,
      manifest,
    };
  }

  /**
   * Helper to write immutable parcel status history records.
   */
  private async recordStatusHistory(
    parcelId: string,
    fromStatus: string | null,
    toStatus: ParcelStatus,
    changedBy: string,
    changedByRole: string,
    reason: string,
    hubId?: string,
  ) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(changedBy);
    const validChangedBy = isUuid ? changedBy : "00000000-0000-0000-0000-000000000000";

    const history = this.statusHistoryRepo.create({
      parcelId,
      fromStatus: fromStatus as any,
      toStatus,
      changedBy: validChangedBy,
      changedByRole,
      reason,
      metadata: { hubId },
    });
    await this.statusHistoryRepo.save(history);
  }
}
