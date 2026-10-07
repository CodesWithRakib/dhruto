import { describe, it, expect, beforeEach } from "vitest";
import { QueryFailedError } from "typeorm";
import { IdempotencyService, IdempotencyClaimConflict } from "./idempotency.service.js";
import { IdempotencyRecord } from "../../database/entities/IdempotencyRecord.entity.js";

/**
 * In-memory stand-in for the idempotency table. It enforces the same unique
 * `(key, scope)` constraint the database does, so the service's concurrency
 * contract can be exercised without a live database.
 */
class FakeIdempotencyStore {
  records: IdempotencyRecord[] = [];

  findOne(options: {
    where?: Array<Record<string, unknown>> | Record<string, unknown>;
  }): Promise<IdempotencyRecord | null> {
    const clauses = Array.isArray(options.where)
      ? options.where
      : options.where
        ? [options.where]
        : [];

    for (const clause of clauses) {
      const key = clause.key as string | undefined;
      const scope = clause.scope as string | undefined;
      const match = this.records.find((record) => record.key === key && record.scope === scope);
      if (match) {
        return Promise.resolve(match);
      }
    }
    return Promise.resolve(null);
  }

  /**
   * Mirrors the service's expiry purge: a record is only released once its TTL
   * has actually elapsed, which is why a fresh in-flight claim still blocks a
   * duplicate request.
   */
  delete(values: { key: string; scope: string }): Promise<unknown> {
    const now = Date.now();
    this.records = this.records.filter((record) => {
      const matches = record.key === values.key && record.scope === values.scope;
      if (!matches) {
        return true;
      }
      const expired = record.expiresAt !== null && record.expiresAt.getTime() < now;
      return !expired;
    });
    return Promise.resolve({ affected: 1 });
  }

  insert(values: Partial<IdempotencyRecord>): Promise<unknown> {
    if (this.findIndex(values.key as string, values.scope as string) >= 0) {
      return Promise.reject(new QueryFailedError("INSERT", [], { code: "23505" } as never));
    }
    this.records.push({
      id: `rec-${this.records.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: null,
      requestHash: null,
      statusCode: null,
      response: null,
      completedAt: null,
      expiresAt: null,
      ...values,
    } as IdempotencyRecord);
    return Promise.resolve(values);
  }

  private findIndex(key: string, scope: string): number {
    return this.records.findIndex((record) => record.key === key && record.scope === scope);
  }
}

function fakeManager(store: FakeIdempotencyStore) {
  return {
    insert: (_entity: unknown, values: Partial<IdempotencyRecord>) => store.insert(values),
    delete: (_entity: unknown, values: { key: string; scope: string }) => store.delete(values),
  };
}

function makeService(store: FakeIdempotencyStore): IdempotencyService {
  return new IdempotencyService({
    findOne: (options: Parameters<FakeIdempotencyStore["findOne"]>[0]) => store.findOne(options),
  } as never);
}

function completedRecord(overrides: Partial<IdempotencyRecord> = {}): IdempotencyRecord {
  return {
    id: "rec-1",
    key: "k1",
    scope: "PARCEL_CREATE",
    requestHash: "hash-1",
    statusCode: 201,
    response: { id: "parcel-1" },
    completedAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as IdempotencyRecord;
}

describe("IdempotencyService", () => {
  let store: FakeIdempotencyStore;
  let service: IdempotencyService;

  beforeEach(() => {
    store = new FakeIdempotencyStore();
    service = makeService(store);
  });

  describe("fingerprint", () => {
    it("is stable across key ordering", () => {
      expect(IdempotencyService.fingerprint({ a: 1, b: "x" })).toBe(
        IdempotencyService.fingerprint({ b: "x", a: 1 }),
      );
    });

    it("changes when a value changes", () => {
      expect(IdempotencyService.fingerprint({ weight: 1 })).not.toBe(
        IdempotencyService.fingerprint({ weight: 2 }),
      );
    });

    it("produces a sha-256 hex digest", () => {
      expect(IdempotencyService.fingerprint({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("claim", () => {
    it("claims a fresh key and records it in flight", async () => {
      await service.claim(fakeManager(store) as never, {
        key: "k1",
        scope: "PARCEL_CREATE",
        requestHash: "hash-1",
      });

      expect(store.records).toHaveLength(1);
      expect(store.records[0]?.statusCode).toBeNull();
      expect(store.records[0]?.response).toBeNull();
    });

    it("rejects a second claim of the same key as a conflict", async () => {
      const manager = fakeManager(store) as never;
      await service.claim(manager, {
        key: "k1",
        scope: "PARCEL_CREATE",
        requestHash: "hash-1",
      });

      await expect(
        service.claim(manager, {
          key: "k1",
          scope: "PARCEL_CREATE",
          requestHash: "hash-2",
        }),
      ).rejects.toBeInstanceOf(IdempotencyClaimConflict);
    });

    it("treats the same key in different scopes as independent commands", async () => {
      const manager = fakeManager(store) as never;
      await service.claim(manager, {
        key: "k1",
        scope: "PARCEL_CREATE",
        requestHash: "hash-1",
      });
      await service.claim(manager, {
        key: "k1",
        scope: "PAYOUT_CREATE",
        requestHash: "hash-1",
      });

      expect(store.records).toHaveLength(2);
    });
  });

  describe("resolve", () => {
    it("replays a completed key with its original response", async () => {
      store.records.push(completedRecord());

      const result = await service.resolve("k1", "PARCEL_CREATE", "hash-1");
      expect(result.kind).toBe("replay");
      if (result.kind === "replay") {
        expect(result.statusCode).toBe(201);
        expect(result.response).toEqual({ id: "parcel-1" });
      }
    });

    it("reports a different payload for the same key as a conflict", async () => {
      store.records.push(completedRecord());

      const result = await service.resolve("k1", "PARCEL_CREATE", "hash-DIFFERENT");
      expect(result).toEqual({ kind: "conflict", reason: "PAYLOAD_MISMATCH" });
    });

    it("reports an unfinished claim as in progress after polling", async () => {
      store.records.push(completedRecord({ statusCode: null, response: null, completedAt: null }));

      const result = await service.resolve("k1", "PARCEL_CREATE", "hash-1", {
        attempts: 2,
        delayMs: 1,
      });
      expect(result.kind).toBe("in_progress");
    });
  });
});
