import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Merchant,
  MerchantStatus,
  Parcel,
  ParcelStatus,
  User,
} from "../database/entities/index.js";
import { UpdateMerchantDto } from "./dto/update-merchant.dto.js";

const PENDING_STATUSES = [
  ParcelStatus.CREATED,
  ParcelStatus.PICKUP_REQUESTED,
  ParcelStatus.PICKUP_ASSIGNED,
];

const IN_TRANSIT_STATUSES = [
  ParcelStatus.PICKED_UP,
  ParcelStatus.ORIGIN_HUB_RECEIVED,
  ParcelStatus.BAGGED,
  ParcelStatus.IN_TRANSIT,
  ParcelStatus.DESTINATION_HUB_RECEIVED,
  ParcelStatus.ASSIGNED_TO_RIDER,
  ParcelStatus.OUT_FOR_DELIVERY,
  ParcelStatus.DELIVERY_ATTEMPTED,
  ParcelStatus.RESCHEDULED,
];

const DELIVERED_STATUSES = [
  ParcelStatus.DELIVERED,
  ParcelStatus.CASH_PENDING,
  ParcelStatus.CASH_VERIFIED,
];

const RETURNED_STATUSES = [
  ParcelStatus.RTO_INITIATED,
  ParcelStatus.RETURN_IN_TRANSIT,
  ParcelStatus.RETURNED_TO_MERCHANT,
];

@Injectable()
export class MerchantsService {
  private readonly logger = new Logger(MerchantsService.name);

  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Parcel)
    private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Retrieves or automatically provisions a merchant profile for an authenticated user.
   */
  async getOrCreateMerchantForUser(userId: string): Promise<Merchant> {
    let merchant = await this.merchantRepo.findOne({
      where: { userId },
      relations: ["user"],
    });

    if (!merchant) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException("User not found");
      }

      merchant = this.merchantRepo.create({
        userId: user.id,
        businessName: `${user.name}'s Shop`,
        contactPhone: user.phone,
        status: MerchantStatus.ACTIVE,
        pickupAddress: "Dhaka Central Warehouse",
      });

      await this.merchantRepo.save(merchant);
      merchant.user = user;
      this.logger.log(`Created new merchant profile for user "${user.email}" (${user.id})`);
    }

    return merchant;
  }

  /**
   * Retrieves merchant profile by user ID.
   */
  async getProfile(userId: string): Promise<Merchant> {
    return this.getOrCreateMerchantForUser(userId);
  }

  /**
   * Finds an existing merchant profile by user ID without auto-creating.
   */
  async findByUserId(userId: string): Promise<Merchant | null> {
    return this.merchantRepo.findOne({
      where: { userId },
      relations: ["user"],
    });
  }

  /**
   * Retrieves the first/default merchant profile for demo fallback.
   */
  async getDefaultMerchant(): Promise<Merchant | null> {
    return this.merchantRepo.findOne({
      where: {},
      order: { createdAt: "ASC" },
      relations: ["user"],
    });
  }

  /**
   * Updates merchant business profile.
   */
  async updateProfile(userId: string, dto: UpdateMerchantDto): Promise<Merchant> {
    const merchant = await this.getOrCreateMerchantForUser(userId);

    if (dto.businessName !== undefined) {
      merchant.businessName = dto.businessName;
    }
    if (dto.contactPhone !== undefined) {
      merchant.contactPhone = dto.contactPhone;
    }
    if (dto.pickupAddress !== undefined) {
      merchant.pickupAddress = dto.pickupAddress;
    }

    return this.merchantRepo.save(merchant);
  }

  /**
   * Calculates comprehensive merchant dashboard metrics from PostgreSQL.
   */
  async getDashboardStats(userId: string) {
    const merchant = await this.getOrCreateMerchantForUser(userId);

    /**
     * Aggregated in SQL rather than by loading every parcel into memory: a
     * merchant with tens of thousands of parcels still resolves in one round
     * trip (docs/05-API-SPEC.md §dashboard).
     */
    const rows = await this.parcelRepo
      .createQueryBuilder("parcel")
      .select("parcel.status", "status")
      .addSelect("COUNT(*)", "count")
      .addSelect("COALESCE(SUM(parcel.cod_amount), 0)", "codAmount")
      .addSelect("COALESCE(SUM(parcel.delivery_fee), 0)", "deliveryFee")
      .where("parcel.merchant_id = :merchantId", { merchantId: merchant.id })
      .groupBy("parcel.status")
      .getRawMany<{
        status: ParcelStatus;
        count: string;
        codAmount: string;
        deliveryFee: string;
      }>();

    let totalOrders = 0;
    let pendingOrders = 0;
    let inTransitOrders = 0;
    let deliveredOrders = 0;
    let returnedOrders = 0;
    let totalCodAmount = 0;
    let collectedCodAmount = 0;
    let totalDeliveryFees = 0;

    for (const row of rows) {
      const count = Number(row.count) || 0;
      const cod = Number(row.codAmount) || 0;
      const fee = Number(row.deliveryFee) || 0;

      totalOrders += count;      totalCodAmount += cod;
      totalDeliveryFees += fee;

      if (PENDING_STATUSES.includes(row.status)) {
        pendingOrders += count;
      } else if (IN_TRANSIT_STATUSES.includes(row.status)) {
        inTransitOrders += count;
      } else if (DELIVERED_STATUSES.includes(row.status)) {
        deliveredOrders += count;
        collectedCodAmount += cod;
      } else if (RETURNED_STATUSES.includes(row.status)) {
        returnedOrders += count;
      }
    }

    const recent = await this.parcelRepo.find({
      where: { merchantId: merchant.id },
      order: { createdAt: "DESC" },
      take: 5,
    });

    const recentParcels = recent.map((parcel) => ({
      id: parcel.id,
      trackingCode: parcel.trackingCode,
      recipientName: parcel.recipientName,
      recipientPhone: parcel.recipientPhone,
      deliveryAddress: parcel.rawAddress,
      district: parcel.district ?? "",
      thana: parcel.thana ?? "",
      codAmount: Number(parcel.codAmount),
      deliveryFee: Number(parcel.deliveryFee),
      status: parcel.status,
      createdAt: parcel.createdAt.toISOString(),
    }));

    return {
      merchant: {
        id: merchant.id,
        businessName: merchant.businessName,
        contactPhone: merchant.contactPhone,
        pickupAddress: merchant.pickupAddress,
        status: merchant.status,
      },
      stats: {
        totalOrders,
        pendingOrders,
        inTransitOrders,
        deliveredOrders,
        returnedOrders,
        totalCodAmount,
        collectedCodAmount,
        totalDeliveryFees,
      },
      recentParcels,
    };
  }
}
