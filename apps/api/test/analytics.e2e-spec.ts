import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { ZodValidationPipe } from 'nestjs-zod';

describe('Analytics & Operational Intelligence (Phase 7 E2E)', () => {
  let app: INestApplication;
  let merchantToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    // Authenticate as merchant
    const merchantLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        emailOrPhone: 'merchant@dhruto.com',
        password: 'dhruto123',
      })
      .expect(200);

    merchantToken = merchantLogin.body.data.tokens.accessToken;
    expect(merchantToken).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. GET /api/v1/analytics/merchant/summary returns comprehensive merchant KPIs and financials', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/merchant/summary')
      .set('Authorization', `Bearer ${merchantToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const data = res.body.data;
    expect(data.period).toBe('30d');
    expect(data.kpis).toBeDefined();
    expect(typeof data.kpis.totalOrders).toBe('number');
    expect(typeof data.kpis.deliverySuccessRate).toBe('number');
    expect(typeof data.kpis.rtoRate).toBe('number');
    expect(typeof data.kpis.avgDeliveryHours).toBe('number');

    expect(data.financials).toBeDefined();
    expect(typeof data.financials.totalBookedCod).toBe('number');
    expect(typeof data.financials.collectedCod).toBe('number');
    expect(typeof data.financials.deliveryCharges).toBe('number');

    expect(Array.isArray(data.dailyTrends)).toBe(true);
    expect(data.dailyTrends.length).toBeGreaterThan(0);
    expect(data.dailyTrends[0]).toHaveProperty('date');
    expect(data.dailyTrends[0]).toHaveProperty('booked');
    expect(data.dailyTrends[0]).toHaveProperty('delivered');

    expect(Array.isArray(data.topDistricts)).toBe(true);
  });

  it('2. GET /api/v1/analytics/merchant/summary with period=7d returns 7-day window data', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/merchant/summary?period=7d')
      .set('Authorization', `Bearer ${merchantToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.period).toBe('7d');
    expect(res.body.data.startDate).toBeDefined();
    expect(res.body.data.endDate).toBeDefined();
  });

  it('3. GET /api/v1/analytics/merchant/summary with period=90d returns 90-day window data', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/merchant/summary?period=90d')
      .set('Authorization', `Bearer ${merchantToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.period).toBe('90d');
  });

  it('4. GET /api/v1/analytics/operations/overview returns system-wide metrics and hub/rider summaries', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/operations/overview')
      .set('Authorization', `Bearer ${merchantToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data;

    expect(typeof data.totalShipments).toBe('number');
    expect(typeof data.activeHubsCount).toBe('number');
    expect(typeof data.activeRidersCount).toBe('number');
    expect(typeof data.networkSuccessRate).toBe('number');
    expect(typeof data.networkRtoRate).toBe('number');
    expect(typeof data.totalCodProcessed).toBe('number');
    expect(typeof data.outstandingCashWithRiders).toBe('number');

    expect(Array.isArray(data.hubThroughputList)).toBe(true);
    expect(Array.isArray(data.topRiders)).toBe(true);
    expect(data.rtoBreakdown).toBeDefined();
    expect(data.codFlow).toBeDefined();
  });

  it('5. GET /api/v1/analytics/hubs/throughput returns throughput and active inventory per hub', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/hubs/throughput')
      .set('Authorization', `Bearer ${merchantToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    if (res.body.data.length > 0) {
      const hub = res.body.data[0];
      expect(hub).toHaveProperty('hubId');
      expect(hub).toHaveProperty('hubName');
      expect(hub).toHaveProperty('totalIncoming');
      expect(hub).toHaveProperty('totalSorted');
      expect(hub).toHaveProperty('inventoryCount');
    }
  });

  it('6. GET /api/v1/analytics/riders/performance returns fleet metrics and cash collections', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/riders/performance')
      .set('Authorization', `Bearer ${merchantToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    if (res.body.data.length > 0) {
      const rider = res.body.data[0];
      expect(rider).toHaveProperty('riderId');
      expect(rider).toHaveProperty('name');
      expect(rider).toHaveProperty('deliveredCount');
      expect(rider).toHaveProperty('completionRate');
      expect(rider).toHaveProperty('cashCollected');
    }
  });

  it('7. GET /api/v1/analytics/rto returns return-to-origin root cause reasons and zone metrics', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/rto')
      .set('Authorization', `Bearer ${merchantToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const rto = res.body.data;
    expect(typeof rto.overallRtoRate).toBe('number');
    expect(Array.isArray(rto.topReasons)).toBe(true);
    expect(rto.topReasons.length).toBeGreaterThan(0);
    expect(Array.isArray(rto.byZone)).toBe(true);
    expect(Array.isArray(rto.byRiskTier)).toBe(true);
  });

  it('8. GET /api/v1/analytics/cod returns complete cash flow from booking to settlement', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/cod')
      .set('Authorization', `Bearer ${merchantToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const cod = res.body.data;
    expect(typeof cod.totalBooked).toBe('number');
    expect(typeof cod.inTransitWithRiders).toBe('number');
    expect(typeof cod.collectedUnsettled).toBe('number');
    expect(typeof cod.settledToMerchants).toBe('number');
  });
});
