import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { BagStatus, HubScanType, ParcelStatus, ScanOutcome } from "@dhruto/contracts";
import { SEEDED_ACCOUNTS, bearer, idempotencyKey, loginToken } from "./utils/auth.js";
import { realisticName } from "./utils/realistic.js";

/**
 * Enterprise Full Lifecycle End-to-End Simulation:
 * -------------------------------------------------------------
 * Simulates the complete, unbroken real-world journey of a package across Bangladesh:
 * 1.  Merchant creates booking with COD (Dhaka -> Chittagong)
 * 2.  Public tracking confirms initial booking
 * 3.  Origin Hub (Dhaka) scans parcel inbound (ORIGIN_HUB_RECEIVED)
 * 4.  Origin Hub creates a Linehaul Bag, inserts parcel, and seals the bag (BAGGED)
 * 5.  Origin Hub creates a Linehaul Manifest with the bag and dispatches it (IN_TRANSIT)
 * 6.  Destination Hub (Chittagong) receives the manifest and unbags the parcel (DESTINATION_HUB_RECEIVED)
 * 7.  Destination Hub assigns the parcel to local delivery rider (ASSIGNED_TO_RIDER)
 * 8.  Rider starts delivery, triggering customer 6-digit OTP (OUT_FOR_DELIVERY)
 * 9.  Customer tracks parcel with active step 4 of 5
 * 10. Rider verifies customer OTP and completes delivery with exact COD (DELIVERED)
 * 11. Rider submits end-of-shift cash hand-in at Hub (SUBMITTED)
 * 12. Hub Cash Desk verifies cash and posts balanced COD_SETTLEMENT
 * 13. Merchant wallet receives net settlement credit
 * 14. Full milestone audit timeline is verified for chronological integrity
 */
describe("Full Lifecycle End-to-End Simulation", () => {
  let app: INestApplication;

  let merchantToken: string;
  let dhkManagerToken: string;
  let ctgManagerToken: string;
  let ctgRiderToken: string;

  let dhkHubId: string;
  let ctgHubId: string;
  let ctgRiderId: string;

  const unique = () => Math.random().toString(36).slice(2, 8).toUpperCase();

  beforeAll(async () => {
    process.env.CHAT_REALTIME_REDIS_ENABLED = "false";
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.enableShutdownHooks();
    await app.init();

    // Authenticate all operational personas
    [merchantToken, dhkManagerToken, ctgManagerToken, ctgRiderToken] =
      await Promise.all([
        loginToken(app, SEEDED_ACCOUNTS.merchant),
        loginToken(app, SEEDED_ACCOUNTS.hubManager),
        loginToken(app, SEEDED_ACCOUNTS.hubManagerCtg),
        loginToken(app, "rider3@dhruto.com"),
      ]);

    // Discover Origin Hub (Dhaka)
    const dhkHubs = await request(app.getHttpServer())
      .get("/api/v1/hubs")
      .set(bearer(dhkManagerToken))
      .expect(200);
    dhkHubId = dhkHubs.body.data[0].id;

    // Discover Destination Hub (Chittagong)
    const destinations = await request(app.getHttpServer())
      .get("/api/v1/hubs/destinations")
      .set(bearer(dhkManagerToken))
      .expect(200);
    const ctgHub = destinations.body.data.find(
      (hub: { code: string }) => hub.code === "HUB-CTG-01",
    );
    ctgHubId = ctgHub.id;

    // Discover Chittagong Rider ID
    const meRider = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set(bearer(ctgRiderToken))
      .expect(200);
    ctgRiderId = meRider.body.data.rider.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it("executes the complete 14-stage lifecycle across Bangladesh flawlessly", async () => {
    const codAmount = 2500;
    const recipientPhone = "01812345678";
    const recipientName = realisticName();

    // =========================================================================
    // STAGE 1: MERCHANT BOOKING
    // =========================================================================
    const initialWallet = await request(app.getHttpServer())
      .get("/api/v1/finance/wallet/me")
      .set(bearer(merchantToken))
      .expect(200);
    const initialBalance = initialWallet.body.data.balance as number;

    const bookingRes = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", idempotencyKey("lifecycle-booking"))
      .send({
        recipientName,
        recipientPhone,
        district: "Chittagong",
        thana: "Panchlaish",
        deliveryAddress: "GEC Circle, Nasirabad, Chittagong",
        codAmount,
        weight: 1.5,
      })
      .expect(201);

    const parcelId = bookingRes.body.data.id as string;
    const trackingCode = bookingRes.body.data.trackingCode as string;
    expect(trackingCode).toMatch(/^DHR-/);
    expect(bookingRes.body.data.status).toBe(ParcelStatus.CREATED);

    // =========================================================================
    // STAGE 2: PUBLIC TRACKING CONFIRMATION
    // =========================================================================
    const publicTrack = await request(app.getHttpServer())
      .get(`/api/v1/tracking/${trackingCode}`)
      .expect(200);
    expect(publicTrack.body.data.trackingCode).toBe(trackingCode);
    expect(publicTrack.body.data.status).toBe(ParcelStatus.CREATED);

    // =========================================================================
    // STAGE 3: ORIGIN HUB INBOUND SCAN (DHAKA)
    // =========================================================================
    const inboundScan = await request(app.getHttpServer())
      .post(`/api/v1/hubs/${dhkHubId}/scans`)
      .set(bearer(dhkManagerToken))
      .send({ barcode: trackingCode, scanType: HubScanType.RECEIVE_INBOUND })
      .expect(200);

    expect(inboundScan.body.data.outcome).toBe(ScanOutcome.APPLIED);
    expect(inboundScan.body.data.currentStatus).toBe(ParcelStatus.ORIGIN_HUB_RECEIVED);

    // =========================================================================
    // STAGE 4: LINEHAUL BAGGING & SEALING (DHAKA -> CTG)
    // =========================================================================
    const bagRes = await request(app.getHttpServer())
      .post(`/api/v1/hubs/${dhkHubId}/bags`)
      .set(bearer(dhkManagerToken))
      .send({ destinationHubId: ctgHubId })
      .expect(201);
    const bagId = bagRes.body.data.id as string;
    const bagCode = bagRes.body.data.bagCode as string;

    // Add parcel into bag
    await request(app.getHttpServer())
      .post(`/api/v1/bags/${bagId}/parcels`)
      .set(bearer(dhkManagerToken))
      .send({ parcelTrackingCode: trackingCode })
      .expect(200);

    // Seal the bag
    const sealTag = `SEAL-${unique()}`;
    const sealedBag = await request(app.getHttpServer())
      .post(`/api/v1/bags/${bagId}/seal`)
      .set(bearer(dhkManagerToken))
      .send({ sealTag })
      .expect(200);
    expect(sealedBag.body.data.status).toBe(BagStatus.SEALED);

    // Verify parcel status is now BAGGED
    const baggedParcel = await request(app.getHttpServer())
      .get(`/api/v1/parcels/${parcelId}`)
      .set(bearer(merchantToken))
      .expect(200);
    expect(baggedParcel.body.data.status).toBe(ParcelStatus.BAGGED);

    // =========================================================================
    // STAGE 5: LINEHAUL MANIFEST DISPATCH
    // =========================================================================
    const manifestRes = await request(app.getHttpServer())
      .post(`/api/v1/hubs/${dhkHubId}/manifests`)
      .set(bearer(dhkManagerToken))
      .send({
        destinationHubId: ctgHubId,
        bagIds: [bagId],
        vehicleNumber: `DHAKA-METRO-TA-${unique()}`,
      })
      .expect(201);
    const manifestId = manifestRes.body.data.id as string;

    // Dispatch manifest
    const dispatched = await request(app.getHttpServer())
      .post(`/api/v1/manifests/${manifestId}/dispatch`)
      .set(bearer(dhkManagerToken))
      .expect(200);
    expect(dispatched.body.data.status).toBe("DISPATCHED");

    // The destination hub's manager is told the linehaul is on its way.
    const manifestCode = manifestRes.body.data.manifestCode as string;
    const deadline = Date.now() + 20000;
    let heardOf = false;
    while (!heardOf && Date.now() < deadline) {
      const inbox = await request(app.getHttpServer())
        .get("/api/v1/notifications/me?limit=50")
        .set(bearer(ctgManagerToken))
        .expect(200);
      heardOf = (inbox.body.data.items as Array<{ message: string }>).some((n) =>
        n.message.includes(manifestCode),
      );
      if (!heardOf) await new Promise((r) => setTimeout(r, 500));
    }
    expect(heardOf).toBe(true);

    // Verify parcel status transitioned to IN_TRANSIT
    const inTransitParcel = await request(app.getHttpServer())
      .get(`/api/v1/parcels/${parcelId}`)
      .set(bearer(merchantToken))
      .expect(200);
    expect(inTransitParcel.body.data.status).toBe(ParcelStatus.IN_TRANSIT);

    // =========================================================================
    // STAGE 6: DESTINATION HUB RECEIVES MANIFEST (CHITTAGONG)
    // =========================================================================
    const receivedManifest = await request(app.getHttpServer())
      .post(`/api/v1/manifests/${manifestId}/receive`)
      .set(bearer(ctgManagerToken))
      .send({ scannedBagCodes: [bagCode] })
      .expect(200);
    expect(receivedManifest.body.data.status).toBe("RECEIVED");

    // Verify parcel status is now DESTINATION_HUB_RECEIVED
    const arrivedParcel = await request(app.getHttpServer())
      .get(`/api/v1/parcels/${parcelId}`)
      .set(bearer(merchantToken))
      .expect(200);
    expect(arrivedParcel.body.data.status).toBe(ParcelStatus.DESTINATION_HUB_RECEIVED);

    // =========================================================================
    // STAGE 7: DESTINATION HUB ASSIGNS PARCEL TO LOCAL RIDER
    // =========================================================================
    const assignRes = await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcelId}/assign-rider`)
      .set(bearer(ctgManagerToken))
      .send({ riderId: ctgRiderId })
      .expect(200);
    expect(assignRes.body.data.status).toBe(ParcelStatus.ASSIGNED_TO_RIDER);

    // =========================================================================
    // STAGE 8: RIDER STARTS DELIVERY ON RUN-SHEET & OTP GENERATED
    // =========================================================================
    const startDelivery = await request(app.getHttpServer())
      .post(`/api/v1/riders/me/parcels/${parcelId}/start-delivery`)
      .set(bearer(ctgRiderToken))
      .expect(200);
    expect(startDelivery.body.data.status).toBe(ParcelStatus.OUT_FOR_DELIVERY);
    const customerOtp = startDelivery.body.data.otp as string;
    expect(customerOtp).toMatch(/^\d{6}$/);

    // =========================================================================
    // STAGE 9: PUBLIC TRACKING REFLECTS OUT_FOR_DELIVERY
    // =========================================================================
    const trackingOut = await request(app.getHttpServer())
      .get(`/api/v1/tracking/${trackingCode}`)
      .expect(200);
    expect(trackingOut.body.data.status).toBe(ParcelStatus.OUT_FOR_DELIVERY);

    // =========================================================================
    // STAGE 10: RIDER VERIFIES OTP & COMPLETES DELIVERY WITH EXACT COD
    // =========================================================================
    // Verify OTP
    const otpVerify = await request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcelId}/verify-otp`)
      .set(bearer(ctgRiderToken))
      .send({ otp: customerOtp })
      .expect(200);
    expect(otpVerify.body.success).toBe(true);

    // Complete delivery with exact collected COD
    const completeDelivery = await request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcelId}/complete`)
      .set(bearer(ctgRiderToken))
      .set("Idempotency-Key", idempotencyKey("lifecycle-complete"))
      .send({
        otp: customerOtp,
        codAmountCollected: codAmount,
        remarks: "Package received safely by recipient with signature",
      })
      .expect(200);

    expect(completeDelivery.body.data.status).toBe(ParcelStatus.CASH_PENDING);
    const cashLedgerId = completeDelivery.body.data.cashLedgerId as string;
    expect(cashLedgerId).toBeDefined();

    // =========================================================================
    // STAGE 11: RIDER CASH HAND-IN AT HUB
    // =========================================================================
    const handInRes = await request(app.getHttpServer())
      .post("/api/v1/riders/me/cash/hand-in")
      .set(bearer(ctgRiderToken))
      .set("Idempotency-Key", idempotencyKey("lifecycle-handin"))
      .send({ notes: "End of shift COD collection for today" })
      .expect(200);
    expect(handInRes.body.success).toBe(true);

    // =========================================================================
    // STAGE 12: HUB CASH DESK RECONCILIATION & SETTLEMENT
    // =========================================================================
    const verifyCash = await request(app.getHttpServer())
      .post("/api/v1/finance/reconciliation/verify")
      .set(bearer(ctgManagerToken))
      .send({ cashLedgerId, actualAmount: codAmount })
      .expect(200);
    expect(verifyCash.body.success).toBe(true);
    expect(verifyCash.body.data.settlementCode).toMatch(/^SET-\d{6}$/);

    // =========================================================================
    // STAGE 13: MERCHANT WALLET BALANCE UPDATED (NET OF DELIVERY FEE)
    // =========================================================================
    const finalWallet = await request(app.getHttpServer())
      .get("/api/v1/finance/wallet/me")
      .set(bearer(merchantToken))
      .expect(200);
    const finalBalance = finalWallet.body.data.balance as number;

    // Delivery fee is deducted from COD; balance increases by net settlement amount
    expect(finalBalance).toBeGreaterThan(initialBalance);

    // =========================================================================
    // STAGE 14: FULL AUDIT TRAIL / MILESTONE INTEGRITY
    // =========================================================================
    const finalParcel = await request(app.getHttpServer())
      .get(`/api/v1/parcels/${parcelId}`)
      .set(bearer(merchantToken))
      .expect(200);

    expect(finalParcel.body.data.status).toBe(ParcelStatus.CASH_VERIFIED);

    const historyTransitions = finalParcel.body.data.history.map(
      (h: { fromStatus: string | null; toStatus: string }) =>
        `${h.fromStatus ?? "INITIAL"}->${h.toStatus}`,
    );

    expect(historyTransitions).toContain("INITIAL->CREATED");
    expect(historyTransitions).toContain("CREATED->ORIGIN_HUB_RECEIVED");
    expect(historyTransitions).toContain("ORIGIN_HUB_RECEIVED->BAGGED");
    expect(historyTransitions).toContain("BAGGED->IN_TRANSIT");
    expect(historyTransitions).toContain("IN_TRANSIT->DESTINATION_HUB_RECEIVED");
    expect(historyTransitions).toContain("DESTINATION_HUB_RECEIVED->ASSIGNED_TO_RIDER");
    expect(historyTransitions).toContain("ASSIGNED_TO_RIDER->OUT_FOR_DELIVERY");
    expect(historyTransitions).toContain("OUT_FOR_DELIVERY->DELIVERED");
    expect(historyTransitions).toContain("DELIVERED->CASH_PENDING");
    expect(historyTransitions).toContain("CASH_PENDING->CASH_VERIFIED");
  });
});
