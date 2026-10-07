import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash } from "node:crypto";
import { EntityManager, IsNull, LessThan, MoreThan, QueryFailedError, Repository } from "typeorm";
import { ApiErrorCode } from "@dhruto/contracts";
import { IdempotencyRecord } from "../../database/entities/IdempotencyRecord.entity.js";

/** Postgres SQLSTATE for unique_violation. */
const PG_UNIQUE_VIOLATION = "23505";

export type IdempotencyResolution =
  | { kind: "replay"; statusCode: number; response: Record<string, unknown> }
  | { kind: "conflict"; reason: "PAYLOAD_MISMATCH" }
  | { kind: "in_progress" };

/** Raised when a claimed key is already held by another request. */
export class IdempotencyClaimConflict extends Error {
  constructor(public readonly key: string) {
    super(`Idempotency key already claimed: ${key}`);
    this.name = "IdempotencyClaimConflict";
  }
}

export interface IdempotencyClaimParams {
  key: string;
  scope: string;
  userId?: string | null;
  requestHash: string;
  ttlHours?: number;
}

export interface IdempotencyCompleteParams {
  key: string;
  scope: string;
  statusCode: number;
  response: Record<string, unknown>;
  userId?: string | null;
  ttlHours?: number;
}

/**
 * Dhruto — idempotent command support.
 * ------------------------------------------------------------------
 * Correctness model (docs/05-API-SPEC.md §7, docs/10-SECURITY.md §4):
 *
 *  1. A request claims `(key, scope)` by inserting an in-flight row *inside the
 *     same transaction as the command*. The unique index is the concurrency
 *     guard: two simultaneous requests cannot both claim the key — the second
 *     blocks on the index and then fails, so only one command ever executes.
 *  2. The response is written back before commit. A replay therefore always
 *     returns the original outcome.
 *  3. Same key + materially different payload is rejected as a conflict rather
 *     than silently creating a second order.
 */
@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(
    @InjectRepository(IdempotencyRecord)
    private readonly idempotencyRepo: Repository<IdempotencyRecord>,
  ) {}

  /** Stable SHA-256 fingerprint of a request payload (key-order independent). */
  static fingerprint(payload: unknown): string {
    return createHash("sha256").update(stableStringify(payload)).digest("hex");
  }

  /** Returns an active (non-expired) record for `(key, scope)`, if any. */
  async find(key: string, scope: string): Promise<IdempotencyRecord | null> {
    if (!key) {
      return null;
    }
    return this.idempotencyRepo.findOne({
      where: [
        { key, scope, expiresAt: MoreThan(new Date()) },
        { key, scope, expiresAt: IsNull() },
      ],
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Atomically claims a key. Must be called inside the transaction that performs
   * the command. Throws {@link IdempotencyClaimConflict} when already claimed.
   */
  async claim(manager: EntityManager, params: IdempotencyClaimParams): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (params.ttlHours ?? 24));

    try {
      // Free the unique slot if a previous record for this key has expired, so
      // a key is genuinely reusable after its TTL instead of being stuck forever.
      await manager.delete(IdempotencyRecord, {
        key: params.key,
        scope: params.scope,
        expiresAt: LessThan(new Date()),
      });

      await manager.insert(IdempotencyRecord, {
        key: params.key,
        scope: params.scope,
        userId: params.userId ?? null,
        requestHash: params.requestHash,
        statusCode: null,
        response: null,
        completedAt: null,
        expiresAt,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new IdempotencyClaimConflict(params.key);
      }
      throw error;
    }
  }

  /** Completes a claimed key with the command's response, inside the transaction. */
  async complete(manager: EntityManager, params: IdempotencyCompleteParams): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (params.ttlHours ?? 24));

    const record = await manager.findOne(IdempotencyRecord, {
      where: { key: params.key, scope: params.scope },
    });
    if (!record) {
      return;
    }

    record.statusCode = params.statusCode;
    record.response = params.response;
    record.completedAt = new Date();
    record.expiresAt = expiresAt;
    await manager.save(record);
  }

  /**
   * Classifies an existing record relative to an incoming request.
   * A concurrent in-flight claim is polled briefly so a duplicate submission
   * usually resolves to a replay rather than an error.
   */
  async resolve(
    key: string,
    scope: string,
    requestHash: string,
    options: { attempts?: number; delayMs?: number } = {},
  ): Promise<IdempotencyResolution> {
    const attempts = options.attempts ?? 10;
    const delayMs = options.delayMs ?? 200;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const record = await this.find(key, scope);

      if (!record) {
        return { kind: "in_progress" };
      }

      if (record.requestHash && requestHash && record.requestHash !== requestHash) {
        return { kind: "conflict", reason: "PAYLOAD_MISMATCH" };
      }

      if (record.response && record.statusCode) {
        return {
          kind: "replay",
          statusCode: record.statusCode,
          response: record.response,
        };
      }

      // Claimed but not completed yet — wait for the competing request.
      await sleep(delayMs);
    }

    return { kind: "in_progress" };
  }

  /** Error code used when a duplicate request arrives with a different payload. */
  static readonly CONFLICT_CODE = ApiErrorCode.IDEMPOTENCY_CONFLICT;
  static readonly IN_PROGRESS_CODE = ApiErrorCode.IDEMPOTENCY_IN_PROGRESS;

  logReplay(scope: string, key: string): void {
    this.logger.log(`IDEMPOTENCY_REPLAY scope=${scope} key=${key}`);
  }

  logConflict(scope: string, key: string): void {
    this.logger.warn(`IDEMPOTENCY_CONFLICT scope=${scope} key=${key}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isUniqueViolation(error: unknown): boolean {
  if (error instanceof QueryFailedError) {
    const driverError = (error as QueryFailedError).driverError as {
      code?: string;
    };
    return driverError?.code === PG_UNIQUE_VIOLATION;
  }
  return false;
}

/** Deterministic JSON serialization (sorted object keys, recursively). */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(",")}}`;
}
