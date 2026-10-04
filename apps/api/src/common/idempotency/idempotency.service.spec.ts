import { describe, it, expect, beforeEach } from "vitest";
import { IdempotencyService } from "./idempotency.service.js";

describe("IdempotencyService", () => {
  let service: IdempotencyService;
  let records: any[] = [];

  const mockRepo: any = {
    findOne: (opts: any) => {
      const match = records.find(r => r.key === opts.where[0].key && r.scope === opts.where[0].scope);
      return Promise.resolve(match || null);
    },
    create: (data: any) => data,
    save: (data: any) => {
      records.push(data);
      return Promise.resolve(data);
    },
  };

  beforeEach(() => {
    records = [];
    service = new IdempotencyService(mockRepo);
  });

  it("should return isDuplicate: false for non-existent key", async () => {
    const result = await service.checkKey("new-key-123", "PARCEL_CREATE");
    expect(result.isDuplicate).toBe(false);
  });

  it("should return cached response for existing key", async () => {
    await service.saveKey("key-456", "PARCEL_CREATE", 201, { id: "parcel-1", status: "CREATED" });

    const result = await service.checkKey("key-456", "PARCEL_CREATE");
    expect(result.isDuplicate).toBe(true);
    expect(result.statusCode).toBe(201);
    expect(result.response).toEqual({ id: "parcel-1", status: "CREATED" });
  });
});
