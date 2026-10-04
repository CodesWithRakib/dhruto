import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import {
  Parcel,
  ParcelStatus,
  ParcelStatusHistory,
  CashLedger,
  CashHandInStatus,
  Rider,
} from "../database/entities/index.js";
import {
  CompleteDeliveryDto,
  FailDeliveryDto,
  CashHandInDto,
} from "./dto/rider-delivery.dto.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { WebhooksService } from "../webhooks/webhooks.service.js";
import { WebhookEvent } from "@dhruto/contracts";

@Injectable()
export class RidersService {
  private readonly logger = new Logger(RidersService.name);

  constructor(
    @InjectRepository(Parcel)
    private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(ParcelStatusHistory)
    private readonly statusHistoryRepo: Repository<ParcelStatusHistory>,
    @InjectRepository(CashLedger)
    private readonly cashLedgerRepo: Repository<CashLedger>,
    @InjectRepository(Rider)
    private readonly riderRepo: Repository<Rider>,
    @Optional()
    private readonly notificationsService?: NotificationsService,
    @Optional()
    private readonly webhooksService?: WebhooksService,
  ) {}

  /**
   * Helper to ensure rider profile exists for the user.
   */
  async getRiderByUserId(userId: string): Promise<Rider> {
    const rider = await this.riderRepo.findOne({
      where: { userId },
      relations: ["hub"],
    });
    if (!rider) {
      throw new NotFoundException("Rider profile not found for this user");
    }
    return rider;
  }

  /**
   * Generates a 6-digit delivery OTP.
   */
  private generateDeliveryOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Get all tasks (deliveries/pickups) assigned to the rider.
   */
  async getAssignedTasks(riderId: string, filterStatus?: ParcelStatus) {
    const whereCondition: any = { currentRiderId: riderId };

    if (filterStatus) {
      whereCondition.status = filterStatus;
    } else {
      // By default return active tasks
      whereCondition.status = In([
        ParcelStatus.ASSIGNED_TO_RIDER,
        ParcelStatus.OUT_FOR_DELIVERY,
        ParcelStatus.DELIVERY_ATTEMPTED,
        ParcelStatus.RESCHEDULED,
      ]);
    }

    const parcels = await this.parcelRepo.find({
      where: whereCondition,
      relations: ["merchant"],
      order: { updatedAt: "DESC" },
    });

    return parcels.map((parcel) => ({
      id: parcel.id,
      trackingCode: parcel.trackingCode,
      status: parcel.status,
      recipientName: parcel.recipientName,
      recipientPhone: parcel.recipientPhone,
      deliveryAddress: parcel.rawAddress,
      district: (parcel.normalizedAddress as any)?.district,
      thana: (parcel.normalizedAddress as any)?.thana,
      weight: Number(parcel.weight),
      codAmount: Number(parcel.codAmount),
      deliveryFee: Number(parcel.deliveryFee),
      deliveryOtp: parcel.deliveryOtp,
      merchantBusinessName: parcel.merchant?.businessName || "Merchant",
      merchantPhone: parcel.merchant?.contactPhone || "",
      createdAt: parcel.createdAt,
      updatedAt: parcel.updatedAt,
    }));
  }

  /**
   * Rider starts out-for-delivery run on an assigned parcel.
   */
  async startDelivery(riderId: string, parcelId: string, userId: string) {
    const parcel = await this.parcelRepo.findOne({
      where: { id: parcelId },
    });

    if (!parcel) {
      throw new NotFoundException("Parcel not found");
    }

    if (parcel.currentRiderId !== riderId) {
      throw new ForbiddenException("This parcel is not assigned to you");
    }

    const allowedInitialStates = [
      ParcelStatus.ASSIGNED_TO_RIDER,
      ParcelStatus.DELIVERY_ATTEMPTED,
      ParcelStatus.RESCHEDULED,
    ];

    if (!allowedInitialStates.includes(parcel.status)) {
      throw new BadRequestException(
        `Cannot start delivery from status '${parcel.status}'. Allowed: ${allowedInitialStates.join(", ")}`,
      );
    }

    const fromStatus = parcel.status;
    const toStatus = ParcelStatus.OUT_FOR_DELIVERY;

    // Generate delivery OTP if not already generated
    if (!parcel.deliveryOtp) {
      parcel.deliveryOtp = this.generateDeliveryOtp();
    }
    parcel.status = toStatus;
    await this.parcelRepo.save(parcel);

    // Record in history
    const history = this.statusHistoryRepo.create({
      parcelId: parcel.id,
      fromStatus,
      toStatus,
      changedBy: userId,
      changedByRole: "RIDER",
      reason: "Rider departed for delivery",
      metadata: { riderId },
    });
    await this.statusHistoryRepo.save(history);

    this.logger.log(
      `Parcel ${parcel.trackingCode} is OUT_FOR_DELIVERY by rider ${riderId}`,
    );

    // Trigger Notification & Webhook
    if (this.notificationsService) {
      await this.notificationsService
        .notifyOutForDelivery(
          parcel.id,
          parcel.trackingCode,
          parcel.recipientPhone,
          parcel.deliveryOtp,
          parcel.merchantId,
        )
        .catch((err) =>
          this.logger.warn(`Failed to dispatch out-for-delivery notification: ${err.message}`),
        );
    }
    if (this.webhooksService) {
      await this.webhooksService
        .dispatchEvent(
          WebhookEvent.PARCEL_OUT_FOR_DELIVERY,
          parcel.merchantId,
          {
            parcelId: parcel.id,
            trackingCode: parcel.trackingCode,
            status: parcel.status,
            riderId,
          },
        )
        .catch((err) =>
          this.logger.warn(`Failed to dispatch out-for-delivery webhook: ${err.message}`),
        );
    }

    return {
      parcelId: parcel.id,
      trackingCode: parcel.trackingCode,
      status: parcel.status,
      deliveryOtp: parcel.deliveryOtp,
      message: "Delivery started. Parcel is now OUT_FOR_DELIVERY.",
    };
  }

  /**
   * Verify delivery OTP submitted by customer to rider.
   */
  async verifyOtp(riderId: string, parcelId: string, otp: string) {
    const parcel = await this.parcelRepo.findOne({ where: { id: parcelId } });
    if (!parcel) {
      throw new NotFoundException("Parcel not found");
    }
    if (parcel.currentRiderId !== riderId) {
      throw new ForbiddenException("This parcel is not assigned to you");
    }

    if (!parcel.deliveryOtp) {
      // If no OTP set, consider valid
      return { valid: true, message: "No OTP required for this parcel" };
    }

    const valid = parcel.deliveryOtp.trim() === otp.trim();
    return {
      valid,
      message: valid ? "OTP verified successfully" : "Invalid OTP code",
    };
  }

  /**
   * Mark parcel as completed/delivered, records cash ledger if COD exists.
   */
  async completeDelivery(
    riderId: string,
    parcelId: string,
    dto: CompleteDeliveryDto,
    userId: string,
  ) {
    const parcel = await this.parcelRepo.findOne({
      where: { id: parcelId },
    });

    if (!parcel) {
      throw new NotFoundException("Parcel not found");
    }

    if (parcel.currentRiderId !== riderId) {
      throw new ForbiddenException("This parcel is not assigned to you");
    }

    if (parcel.status !== ParcelStatus.OUT_FOR_DELIVERY) {
      throw new BadRequestException(
        `Parcel must be in OUT_FOR_DELIVERY status to be completed. Current status: ${parcel.status}`,
      );
    }

    // Verify OTP if provided or required
    if (dto.otp && parcel.deliveryOtp && dto.otp.trim() !== parcel.deliveryOtp.trim()) {
      throw new BadRequestException("Invalid delivery OTP code");
    }

    const codAmount = Number(parcel.codAmount);
    const collectedAmount =
      dto.codAmountCollected !== undefined
        ? Number(dto.codAmountCollected)
        : codAmount;

    const fromStatus = parcel.status;
    // According to docs/08-STATE-MACHINE.md:
    // If COD exists, transitions DELIVERED -> CASH_PENDING
    const toStatus = codAmount > 0 ? ParcelStatus.CASH_PENDING : ParcelStatus.DELIVERED;

    parcel.status = toStatus;
    await this.parcelRepo.save(parcel);

    // Record status history
    const history = this.statusHistoryRepo.create({
      parcelId: parcel.id,
      fromStatus,
      toStatus,
      changedBy: userId,
      changedByRole: "RIDER",
      reason: dto.remarks || "Delivered to recipient",
      metadata: {
        riderId,
        codCollected: collectedAmount,
        proofPhotoUrl: dto.proofPhotoUrl || null,
      },
    });
    await this.statusHistoryRepo.save(history);

    // If COD collected, record in CashLedger
    let cashLedger = null;
    if (collectedAmount > 0) {
      const rider = await this.riderRepo.findOne({ where: { id: riderId } });

      cashLedger = this.cashLedgerRepo.create({
        parcelId: parcel.id,
        riderId,
        hubId: rider?.hubId || null,
        amount: collectedAmount,
        collectedAt: new Date(),
        handInStatus: CashHandInStatus.PENDING,
      });
      await this.cashLedgerRepo.save(cashLedger);

      this.logger.log(
        `COD Collected: ৳${collectedAmount} for Parcel ${parcel.trackingCode}. Recorded in CashLedger.`,
      );
    }

    // Trigger Notification & Webhook
    if (this.notificationsService) {
      await this.notificationsService
        .notifyDeliveryComplete(
          parcel.id,
          parcel.trackingCode,
          parcel.recipientPhone,
          collectedAmount,
          parcel.merchantId,
        )
        .catch((err) =>
          this.logger.warn(`Failed to dispatch delivery complete notification: ${err.message}`),
        );
    }
    if (this.webhooksService) {
      await this.webhooksService
        .dispatchEvent(
          WebhookEvent.PARCEL_DELIVERED,
          parcel.merchantId,
          {
            parcelId: parcel.id,
            trackingCode: parcel.trackingCode,
            status: parcel.status,
            codAmountCollected: collectedAmount,
            cashLedgerId: cashLedger?.id || null,
          },
        )
        .catch((err) =>
          this.logger.warn(`Failed to dispatch parcel delivered webhook: ${err.message}`),
        );
    }

    return {
      parcelId: parcel.id,
      trackingCode: parcel.trackingCode,
      status: parcel.status,
      codAmountCollected: collectedAmount,
      cashLedgerId: cashLedger?.id || null,
      message: "Parcel marked as delivered successfully.",
    };
  }

  /**
   * Mark parcel delivery as failed/attempted.
   */
  async failDelivery(
    riderId: string,
    parcelId: string,
    dto: FailDeliveryDto,
    userId: string,
  ) {
    const parcel = await this.parcelRepo.findOne({
      where: { id: parcelId },
    });

    if (!parcel) {
      throw new NotFoundException("Parcel not found");
    }

    if (parcel.currentRiderId !== riderId) {
      throw new ForbiddenException("This parcel is not assigned to you");
    }

    if (parcel.status !== ParcelStatus.OUT_FOR_DELIVERY) {
      throw new BadRequestException(
        `Parcel must be in OUT_FOR_DELIVERY to mark as failed. Current status: ${parcel.status}`,
      );
    }

    const fromStatus = parcel.status;
    const toStatus = dto.rescheduledDate
      ? ParcelStatus.RESCHEDULED
      : ParcelStatus.DELIVERY_ATTEMPTED;

    parcel.status = toStatus;
    await this.parcelRepo.save(parcel);

    const history = this.statusHistoryRepo.create({
      parcelId: parcel.id,
      fromStatus,
      toStatus,
      changedBy: userId,
      changedByRole: "RIDER",
      reason: `Delivery failed: ${dto.reason}. ${dto.notes || ""}`,
      metadata: {
        riderId,
        reason: dto.reason,
        rescheduledDate: dto.rescheduledDate || null,
        notes: dto.notes || null,
      },
    });
    await this.statusHistoryRepo.save(history);

    return {
      parcelId: parcel.id,
      trackingCode: parcel.trackingCode,
      status: parcel.status,
      reason: dto.reason,
      message: `Delivery attempt recorded as ${parcel.status}.`,
    };
  }

  /**
   * Rider hands in collected cash to hub manager.
   */
  async handInCash(riderId: string, userId: string, dto: CashHandInDto) {
    const pendingLedgers = await this.cashLedgerRepo.find({
      where: {
        riderId,
        handInStatus: CashHandInStatus.PENDING,
      },
    });

    if (pendingLedgers.length === 0) {
      return {
        handedInCount: 0,
        totalAmount: 0,
        message: "No pending cash to hand in",
      };
    }

    const totalAmount = pendingLedgers.reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    );

    // Update all pending ledgers to HANDED_IN
    for (const ledger of pendingLedgers) {
      ledger.handInStatus = CashHandInStatus.HANDED_IN;
      await this.cashLedgerRepo.save(ledger);
    }

    this.logger.log(
      `Rider ${riderId} (User ${userId}) handed in ৳${totalAmount} across ${pendingLedgers.length} parcels. Notes: ${dto.notes || "None"}`,
    );

    return {
      handedInCount: pendingLedgers.length,
      totalAmount,
      ledgerIds: pendingLedgers.map((l) => l.id),
      message: `Successfully handed in ৳${totalAmount}. Awaiting Hub verification.`,
    };
  }

  /**
   * Summary of rider's COD collection and cash hand-in status.
   */
  async getCashSummary(riderId: string) {
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
}
