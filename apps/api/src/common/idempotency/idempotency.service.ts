import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan } from "typeorm";
import { IdempotencyRecord } from "../../database/entities/IdempotencyRecord.entity.js";

export interface IdempotencyLookupResult {
  isDuplicate: boolean;
  statusCode?: number;
  response?: Record<string, unknown>;
}

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(
    @InjectRepository(IdempotencyRecord)
    private readonly idempotencyRepo: Repository<IdempotencyRecord>,
  ) {}

  /**
   * Checks if an idempotency key has already been recorded within the given scope.
   */
  async checkKey(key: string, scope: string = "DEFAULT"): Promise<IdempotencyLookupResult> {
    if (!key) {
      return { isDuplicate: false };
    }

    const now = new Date();
    const existing = await this.idempotencyRepo.findOne({
      where: [
        { key, scope, expiresAt: MoreThan(now) },
        { key, scope, expiresAt: undefined },
      ],
    });

    if (existing) {
      this.logger.log(`Idempotency cache hit for key="${key}" in scope="${scope}"`);
      return {
        isDuplicate: true,
        statusCode: existing.statusCode,
        response: existing.response,
      };
    }

    return { isDuplicate: false };
  }

  /**
   * Persists a successful operation response under the idempotency key.
   */
  async saveKey(
    key: string,
    scope: string,
    statusCode: number,
    response: Record<string, unknown>,
    userId?: string,
    ttlHours = 24,
  ): Promise<void> {
    if (!key) return;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    try {
      const record = this.idempotencyRepo.create({
        key,
        scope,
        statusCode,
        response,
        userId: userId || null,
        expiresAt,
      });

      await this.idempotencyRepo.save(record);
      this.logger.log(`Saved idempotency record for key="${key}" in scope="${scope}"`);
    } catch (err: any) {
      this.logger.warn(`Failed to save idempotency key "${key}": ${err?.message}`);
    }
  }
}
