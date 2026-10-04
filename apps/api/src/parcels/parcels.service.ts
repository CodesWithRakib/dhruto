import { Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like, FindOptionsWhere } from "typeorm";
import {
  type ParcelBooking,
  type ParcelCreatedResponse,
  type ParcelDetailsResponse,
  type PublicTrackingResponse,
  type ShippingLabelResponse,
  type TimelineEvent,
  ParcelStatus,
  WebhookEvent,
  NotificationChannel,
  NotificationType,
} from "@dhruto/contracts";
import { randomUUID } from "node:crypto";
import {
  Parcel,
  ParcelStatusHistory,
  Merchant,
  ParcelAssignment,
  Rider,
  Hub,
} from "../database/entities/index.js";
import { PricingService } from "../pricing/pricing.service.js";
import { IdempotencyService } from "../common/idempotency/idempotency.service.js";
import { generateBarcodeSvg } from "../common/utils/barcode.util.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { WebhooksService } from "../webhooks/webhooks.service.js";
import { IntelligenceService } from "../intelligence/intelligence.service.js";

const STATUS_DESCRIPTIONS: Record<string, { en: string; bn: string }> = {
  [ParcelStatus.CREATED]: { en: "Booking Created", bn: "বুকিং সম্পন্ন হয়েছে" },
  [ParcelStatus.PICKUP_REQUESTED]: { en: "Pickup Requested", bn: "পিকআপের অনুরোধ গৃহীত হয়েছে" },
  [ParcelStatus.PICKUP_ASSIGNED]: { en: "Rider Assigned for Pickup", bn: "পিকআপের জন্য রাইডার নিযুক্ত" },
  [ParcelStatus.PICKED_UP]: { en: "Parcel Picked Up", bn: "পার্সেল পিকআপ সম্পন্ন হয়েছে" },
  [ParcelStatus.ORIGIN_HUB_RECEIVED]: { en: "Received at Sorting Hub", bn: "সর্টিং হাবে পার্সেল গৃহীত হয়েছে" },
  [ParcelStatus.BAGGED]: { en: "Packed in Transit Bag", bn: "ট্রানজিট ব্যাগে সংরক্ষিত" },
  [ParcelStatus.IN_TRANSIT]: { en: "In Transit to Destination Hub", bn: "গন্তব্য হাবে প্রেরিত হচ্ছে" },
  [ParcelStatus.DESTINATION_HUB_RECEIVED]: { en: "Reached Destination Hub", bn: "গন্তব্য ডেলিভারি হাবে পৌঁছেছে" },
  [ParcelStatus.ASSIGNED_TO_RIDER]: { en: "Assigned to Delivery Rider", bn: "ডেলিভারি রাইডার নির্ধারিত" },
  [ParcelStatus.OUT_FOR_DELIVERY]: { en: "Out for Delivery", bn: "ডেলিভারির জন্য বের হয়েছে" },
  [ParcelStatus.DELIVERY_ATTEMPTED]: { en: "Delivery Attempted", bn: "ডেলিভারির চেষ্টা করা হয়েছে" },
  [ParcelStatus.RESCHEDULED]: { en: "Delivery Rescheduled", bn: "ডেলিভারি পুনঃনির্ধারিত হয়েছে" },
  [ParcelStatus.DELIVERED]: { en: "Delivered to Recipient", bn: "সফলভাবে ডেলিভারি সম্পন্ন" },
  [ParcelStatus.CASH_PENDING]: { en: "Cash Collected from Recipient", bn: "ক্যাশ গ্রহণ করা হয়েছে" },
  [ParcelStatus.CASH_VERIFIED]: { en: "COD Amount Verified & Reconciled", bn: "ক্যাশ যাচাই সম্পন্ন" },
  [ParcelStatus.RTO_INITIATED]: { en: "Return to Merchant Initiated", bn: "মার্চেন্টকে ফেরত প্রক্রিয়া শুরু" },
  [ParcelStatus.RETURN_IN_TRANSIT]: { en: "Return in Transit", bn: "ফেরত পার্সেল ট্রানজিটে রয়েছে" },
  [ParcelStatus.RETURNED_TO_MERCHANT]: { en: "Returned to Merchant", bn: "মার্চেন্টের নিকট ফেরত সম্পন্ন" },
  [ParcelStatus.CANCELLED]: { en: "Order Cancelled", bn: "অর্ডার বাতিল করা হয়েছে" },
  [ParcelStatus.LOST]: { en: "Marked as Lost", bn: "হারিয়ে গেছে" },
  [ParcelStatus.DAMAGED]: { en: "Marked as Damaged", bn: "ক্ষতিগ্রস্ত হয়েছে" },
};

@Injectable()
export class ParcelsService {
  private readonly logger = new Logger(ParcelsService.name);

  constructor(
    @InjectRepository(Parcel)
    private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(ParcelStatusHistory)
    private readonly parcelStatusHistoryRepo: Repository<ParcelStatusHistory>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(ParcelAssignment)
    private readonly assignmentRepo: Repository<ParcelAssignment>,
    @InjectRepository(Rider)
    private readonly riderRepo: Repository<Rider>,
    @InjectRepository(Hub)
    private readonly hubRepo: Repository<Hub>,
    private readonly pricingService: PricingService,
    private readonly idempotencyService: IdempotencyService,
    @Optional()
    private readonly notificationsService?: NotificationsService,
    @Optional()
    private readonly webhooksService?: WebhooksService,
    @Optional()
    private readonly intelligenceService?: IntelligenceService,
  ) {}

  /**
   * Generates a canonical tracking code: DHR-YYYYMMDD-XXXX
   */
  private generateTrackingCode(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
    return `DHR-${dateStr}-${randomHex}`;
  }

  /**
   * Masks recipient phone for public privacy: 01712345678 -> 017****5678
   */
  private maskPhone(phone: string): string {
    if (!phone || phone.length < 8) return "017****";
    return phone.slice(0, 3) + "****" + phone.slice(-4);
  }

  /**
   * Creates a new parcel booking with dynamic pricing and idempotency check.
   */
  async createParcel(
    booking: ParcelBooking,
    idempotencyKey?: string,
    merchantUserId?: string,
  ): Promise<ParcelCreatedResponse> {
    // 1. Idempotency Check
    if (idempotencyKey) {
      const cached = await this.idempotencyService.checkKey(idempotencyKey, "PARCEL_CREATE");
      if (cached.isDuplicate && cached.response) {
        this.logger.log(`Idempotent replay for parcel booking key="${idempotencyKey}"`);
        return cached.response as unknown as ParcelCreatedResponse;
      }
    }

    this.logger.log(
      `Creating parcel booking for recipient "${booking.recipientName}" in district "${booking.district}"`,
    );

    // 2. Dynamic Pricing calculation
    const pricing = this.pricingService.calculate({
      district: booking.district,
      thana: booking.thana,
      weight: booking.weight,
      codAmount: booking.codAmount,
    });

    const trackingCode = this.generateTrackingCode();

    // 3. Resolve Merchant
    let merchant: Merchant | null = null;
    if (merchantUserId) {
      merchant = await this.merchantRepo.findOne({ where: { userId: merchantUserId } });
    }
    if (!merchant) {
      merchant = await this.merchantRepo.findOne({ where: {} });
    }
    if (!merchant) {
      merchant = this.merchantRepo.create({
        id: randomUUID(),
        userId: merchantUserId || randomUUID(),
        businessName: "Primary Merchant",
        contactPhone: "01711112222",
        pickupAddress: "Dhaka Central Warehouse",
      });
      await this.merchantRepo.save(merchant);
    }

    // 4. Intelligence scoring (Address confidence + RTO risk profile)
    let intelligenceData: Record<string, any> = {};
    if (this.intelligenceService) {
      try {
        const intel = await this.intelligenceService.analyzeBooking({
          recipientPhone: booking.recipientPhone,
          codAmount: Number(booking.codAmount),
          rawAddress: booking.deliveryAddress,
          district: booking.district,
          thana: booking.thana,
          weight: Number(booking.weight),
        });
        intelligenceData = {
          confidenceScore: intel.parsedAddress.confidenceScore,
          confidenceTier: intel.parsedAddress.confidenceTier,
          riskScore: intel.riskProfile.riskScore,
          riskTier: intel.riskProfile.riskTier,
          rtoProbability: intel.riskProfile.rtoProbability,
          recommendations: intel.riskProfile.operationalRecommendations,
        };
      } catch (err: any) {
        this.logger.warn(`Intelligence analysis skipped: ${err.message}`);
      }
    }

    const parcel = this.parcelRepo.create({
      merchantId: merchant.id,
      trackingCode,
      recipientName: booking.recipientName,
      recipientPhone: booking.recipientPhone,
      rawAddress: booking.deliveryAddress,
      normalizedAddress: {
        district: booking.district,
        thana: booking.thana,
        zone: pricing.zone,
        ...intelligenceData,
      },
      weight: Number(booking.weight),
      codAmount: Number(booking.codAmount),
      deliveryFee: pricing.totalFee,
      status: ParcelStatus.CREATED,
    });

    await this.parcelRepo.save(parcel);

    // 4. Initial History
    const history = this.parcelStatusHistoryRepo.create({
      parcelId: parcel.id,
      toStatus: ParcelStatus.CREATED,
      changedBy: merchant.userId,
      changedByRole: "MERCHANT",
      reason: "Initial booking created",
      metadata: { pricing },
    });
    await this.parcelStatusHistoryRepo.save(history);

    const response: ParcelCreatedResponse = {
      id: parcel.id,
      trackingCode: parcel.trackingCode,
      recipientName: parcel.recipientName,
      recipientPhone: parcel.recipientPhone,
      district: booking.district,
      thana: booking.thana,
      deliveryAddress: parcel.rawAddress,
      codAmount: Number(parcel.codAmount),
      weight: Number(parcel.weight),
      deliveryFee: Number(parcel.deliveryFee),
      status: parcel.status as any,
      normalizedAddress: parcel.normalizedAddress as any,
      createdAt: parcel.createdAt.toISOString(),
    };

    // 5. Save Idempotency Record
    if (idempotencyKey) {
      await this.idempotencyService.saveKey(
        idempotencyKey,
        "PARCEL_CREATE",
        201,
        response as any,
        merchant.userId,
      );
    }

    // 6. Webhook dispatch & In-app notification
    if (this.webhooksService) {
      await this.webhooksService
        .dispatchEvent(WebhookEvent.PARCEL_CREATED, merchant.id, response)
        .catch((err) =>
          this.logger.warn(`Failed to dispatch parcel.created webhook: ${err.message}`),
        );
    }
    if (this.notificationsService) {
      await this.notificationsService
        .createNotification({
          merchantId: merchant.id,
          channel: NotificationChannel.IN_APP,
          type: NotificationType.PARCEL_STATUS_UPDATE,
          title: "Parcel Booking Created",
          message: `Parcel ${parcel.trackingCode} booked for ${parcel.recipientName}.`,
          metadata: { parcelId: parcel.id, trackingCode: parcel.trackingCode },
        })
        .catch((err) =>
          this.logger.warn(`Failed to dispatch in-app notification: ${err.message}`),
        );
    }

    return response;
  }

  /**
   * Retrieves parcel details by ID or tracking code.
   */
  async getParcelById(idOrCode: string): Promise<ParcelDetailsResponse> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCode);
    const where = isUuid ? { id: idOrCode } : { trackingCode: idOrCode };

    const parcel = await this.parcelRepo.findOne({
      where,
      relations: ["merchant", "currentRider", "currentRider.user", "currentHub"],
    });

    if (!parcel) {
      throw new NotFoundException(`Parcel not found: ${idOrCode}`);
    }

    const history = await this.parcelStatusHistoryRepo.find({
      where: { parcelId: parcel.id },
      order: { createdAt: "ASC" },
    });

    const statusHistory = history.map(h => ({
      id: h.id,
      fromStatus: h.fromStatus || null,
      toStatus: h.toStatus as ParcelStatus,
      changedByRole: h.changedByRole,
      reason: h.reason || null,
      createdAt: h.createdAt.toISOString(),
    }));

    return {
      id: parcel.id,
      trackingCode: parcel.trackingCode,
      recipientName: parcel.recipientName,
      recipientPhone: parcel.recipientPhone,
      district: (parcel.normalizedAddress as any)?.district || "Dhaka",
      thana: (parcel.normalizedAddress as any)?.thana || "Dhanmondi",
      deliveryAddress: parcel.rawAddress,
      codAmount: Number(parcel.codAmount),
      weight: Number(parcel.weight),
      deliveryFee: Number(parcel.deliveryFee),
      status: parcel.status as any,
      normalizedAddress: parcel.normalizedAddress as any,
      createdAt: parcel.createdAt.toISOString(),
      merchantId: parcel.merchantId,
      merchantName: parcel.merchant?.businessName || "Dhruto Merchant",
      pickupAddress: parcel.merchant?.pickupAddress || "Dhaka Warehouse",
      currentRiderName: parcel.currentRider?.user?.name || null,
      currentRiderPhone: parcel.currentRider?.user?.phone || null,
      currentHubName: parcel.currentHub?.name || null,
      statusHistory,
    };
  }

  /**
   * Public tracking endpoint returning sanitized timeline and masked details.
   */
  async getTracking(trackingCode: string): Promise<PublicTrackingResponse> {
    const parcel = await this.parcelRepo.findOne({
      where: { trackingCode },
      relations: ["currentHub"],
    });

    if (!parcel) {
      throw new NotFoundException(`Tracking code not found: ${trackingCode}`);
    }

    const history = await this.parcelStatusHistoryRepo.find({
      where: { parcelId: parcel.id },
      order: { createdAt: "ASC" },
    });

    const timeline: TimelineEvent[] = history.map(h => {
      const desc = STATUS_DESCRIPTIONS[h.toStatus] || {
        en: h.toStatus,
        bn: h.toStatus,
      };

      return {
        status: h.toStatus as ParcelStatus,
        labelEn: desc.en,
        labelBn: desc.bn,
        timestamp: h.createdAt.toISOString(),
        note: h.reason || undefined,
      };
    });

    return {
      trackingCode: parcel.trackingCode,
      status: parcel.status as any,
      recipientDistrict: (parcel.normalizedAddress as any)?.district || "Dhaka",
      recipientThana: (parcel.normalizedAddress as any)?.thana || "",
      recipientPhoneMasked: this.maskPhone(parcel.recipientPhone),
      createdAt: parcel.createdAt.toISOString(),
      updatedAt: parcel.updatedAt.toISOString(),
      currentHubName: parcel.currentHub?.name || null,
      timeline,
    };
  }

  /**
   * Generates printable shipping label representation with SVG barcode.
   */
  async getShippingLabel(idOrCode: string): Promise<ShippingLabelResponse> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCode);
    const where = isUuid ? { id: idOrCode } : { trackingCode: idOrCode };

    const parcel = await this.parcelRepo.findOne({
      where,
      relations: ["merchant", "currentHub"],
    });

    if (!parcel) {
      throw new NotFoundException(`Parcel not found: ${idOrCode}`);
    }

    const district = (parcel.normalizedAddress as any)?.district || "Dhaka";
    const thana = (parcel.normalizedAddress as any)?.thana || "Dhanmondi";
    const zone = this.pricingService.resolveZone(district, thana);
    const barcodeSvg = generateBarcodeSvg(parcel.trackingCode, { height: 50, barWidth: 2 });

    let routingHub = parcel.currentHub?.name;
    if (!routingHub && parcel.currentHubId) {
      const hub = await this.hubRepo.findOne({ where: { id: parcel.currentHubId } });
      if (hub) routingHub = hub.name;
    }
    if (!routingHub) {
      const defaultHub = await this.hubRepo.findOne({ where: {} });
      routingHub = defaultHub?.name || "Dhaka Central Sorting Hub (DHK-01)";
    }

    return {
      trackingCode: parcel.trackingCode,
      barcodeSvg,
      merchantName: parcel.merchant?.businessName || "Dhruto Merchant",
      merchantPhone: parcel.merchant?.contactPhone || "01700000000",
      pickupAddress: parcel.merchant?.pickupAddress || "Dhaka Central Warehouse",
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

  /**
   * Assigns a parcel to a rider.
   */
  async assignRider(parcelId: string, riderId: string, assignedByUserId?: string) {
    const parcel = await this.parcelRepo.findOne({ where: { id: parcelId } });
    if (!parcel) {
      throw new NotFoundException("Parcel not found");
    }

    const rider = await this.riderRepo.findOne({ where: { id: riderId } });
    if (!rider) {
      throw new NotFoundException("Rider not found");
    }

    const fromStatus = parcel.status;
    parcel.currentRiderId = rider.id;
    parcel.status = ParcelStatus.ASSIGNED_TO_RIDER;
    await this.parcelRepo.save(parcel);

    const assignment = this.assignmentRepo.create({
      parcelId: parcel.id,
      riderId: rider.id,
      assignedBy: assignedByUserId || rider.userId,
      assignedAt: new Date(),
    });
    await this.assignmentRepo.save(assignment);

    const history = this.parcelStatusHistoryRepo.create({
      parcelId: parcel.id,
      fromStatus,
      toStatus: ParcelStatus.ASSIGNED_TO_RIDER,
      changedBy: assignedByUserId || rider.userId,
      changedByRole: "HUB_MANAGER",
      reason: `Assigned to rider ${rider.id}`,
      metadata: { riderId: rider.id },
    });
    await this.parcelStatusHistoryRepo.save(history);

    this.logger.log(`Parcel ${parcel.trackingCode} assigned to rider ${rider.id}`);

    return {
      parcelId: parcel.id,
      trackingCode: parcel.trackingCode,
      riderId: rider.id,
      status: parcel.status,
      message: "Parcel assigned to rider successfully",
    };
  }

  /**
   * Retrieves a filtered list of parcels.
   */
  async findAll(options?: {
    status?: ParcelStatus;
    search?: string;
    merchantId?: string;
    limit?: number;
  }): Promise<ParcelCreatedResponse[]> {
    const where: FindOptionsWhere<Parcel> = {};

    if (options?.status) {
      where.status = options.status;
    }
    if (options?.merchantId) {
      where.merchantId = options.merchantId;
    }

    const parcels = await this.parcelRepo.find({
      where: options?.search
        ? [
            { ...where, trackingCode: Like(`%${options.search}%`) },
            { ...where, recipientName: Like(`%${options.search}%`) },
            { ...where, recipientPhone: Like(`%${options.search}%`) },
          ]
        : where,
      order: { createdAt: "DESC" },
      take: options?.limit || 50,
    });

    return parcels.map(parcel => ({
      id: parcel.id,
      trackingCode: parcel.trackingCode,
      recipientName: parcel.recipientName,
      recipientPhone: parcel.recipientPhone,
      district: (parcel.normalizedAddress as any)?.district || "Dhaka",
      thana: (parcel.normalizedAddress as any)?.thana || "",
      deliveryAddress: parcel.rawAddress,
      codAmount: Number(parcel.codAmount),
      weight: Number(parcel.weight),
      deliveryFee: Number(parcel.deliveryFee),
      status: parcel.status as any,
      createdAt: parcel.createdAt.toISOString(),
    }));
  }
}
