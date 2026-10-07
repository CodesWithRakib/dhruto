import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { EntityManager, QueryFailedError } from "typeorm";
import {
  ApiErrorCode,
  CURRENCY_BDT,
  EntryDirection,
  FinancialAccount,
  FinancialTransactionStatus,
  FinancialTransactionType,
} from "@dhruto/contracts";
import { FinancialEntry, FinancialTransaction } from "../../database/entities/index.js";
import {
  IdempotencyClaimConflict,
  IdempotencyService,
} from "../../common/idempotency/idempotency.service.js";

const PG_UNIQUE_VIOLATION = "23505";

export interface LedgerEntryInput {
  account: FinancialAccount;
  direction: EntryDirection;
  /** Integer minor units, must be > 0. */
  amountMinor: number;
  merchantId?: string | null;
  memo?: string;
}

export interface PostLedgerInput {
  type: FinancialTransactionType;
  referenceType?: string | null;
  referenceId?: string | null;
  description?: string | null;
  entries: LedgerEntryInput[];
  idempotencyKey?: string;
  idempotencyScope?: string;
  createdBy?: string | null;
}

/**
 * Dhruto double-entry journal — Phase 4 financial source of truth.
 * ------------------------------------------------------------------
 * Every posting is validated (positive integer minor units, single currency,
 * ΣDEBIT == ΣCREDIT) and written atomically with its entries. Postings are
 * immutable: corrections are new REVERSAL/ADJUSTMENT transactions linked
 * through `reversalOfId`. Materialized wallet balances are caches updated in
 * the same database transaction, never the source of truth.
 */
@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly idempotency: IdempotencyService) {}

  /**
   * Posts a balanced transaction. With an idempotency key/scope the response
   * is replayed instead of duplicated.
   */
  async post(manager: EntityManager, input: PostLedgerInput): Promise<FinancialTransaction> {
    this.assertBalancedInput(input);

    if (input.idempotencyKey && input.idempotencyScope) {
      const requestHash = IdempotencyService.fingerprint({
        type: input.type,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        entries: input.entries,
      });
      const resolution = await this.idempotency.resolve(
        input.idempotencyKey,
        input.idempotencyScope,
        requestHash,
      );
      if (resolution.kind === "replay") {
        const transactionId = (resolution.response as { transactionId?: string }).transactionId;
        const existing = transactionId
          ? await manager.findOne(FinancialTransaction, {
              where: { id: transactionId },
              relations: ["entries"],
            })
          : null;
        if (existing) {
          this.idempotency.logReplay(input.idempotencyScope, input.idempotencyKey);
          return existing;
        }
      }
      if (resolution.kind === "conflict") {
        this.idempotency.logConflict(input.idempotencyScope, input.idempotencyKey);
        throw new ConflictException({
          message: "Idempotency key was already used with a different payload",
          error: IdempotencyService.CONFLICT_CODE,
        });
      }
      try {
        await this.idempotency.claim(manager, {
          key: input.idempotencyKey,
          scope: input.idempotencyScope,
          userId: input.createdBy ?? null,
          requestHash,
        });
      } catch (error) {
        if (error instanceof IdempotencyClaimConflict) {
          throw new ConflictException({
            message: "Financial posting is already in progress for this key",
            error: IdempotencyService.IN_PROGRESS_CODE,
          });
        }
        throw error;
      }
    }

    const transaction = await this.insertTransaction(manager, input);

    if (input.idempotencyKey && input.idempotencyScope) {
      await this.idempotency.complete(manager, {
        key: input.idempotencyKey,
        scope: input.idempotencyScope,
        statusCode: HttpStatus.OK,
        response: { transactionId: transaction.id },
        userId: input.createdBy ?? null,
      });
    }

    return transaction;
  }

  /** Verifies ΣDEBIT == ΣCREDIT for a posted transaction. */
  async verifyTransaction(
    manager: EntityManager,
    transactionId: string,
  ): Promise<{ balanced: boolean; debitMinor: number; creditMinor: number }> {
    const entries = await manager.find(FinancialEntry, { where: { transactionId } });
    let debitMinor = 0;
    let creditMinor = 0;
    for (const entry of entries) {
      const amount = Number(entry.amountMinor);
      if (entry.direction === EntryDirection.DEBIT) debitMinor += amount;
      else creditMinor += amount;
    }
    return { balanced: debitMinor === creditMinor && entries.length > 0, debitMinor, creditMinor };
  }

  /**
   * Ledger-derived balance for a merchant-scoped account.
   *
   * MERCHANT_AVAILABLE is credit-normal (the platform owes the merchant):
   * settlements and releases CREDIT it, reservations DEBIT it. Derived
   * balance is therefore ΣCREDIT − ΣDEBIT, matching the materialized wallet.
   */
  async merchantAccountBalance(
    manager: EntityManager,
    merchantId: string,
    account: FinancialAccount,
  ): Promise<number> {
    const rows = await manager
      .createQueryBuilder(FinancialEntry, "entry")
      .select("entry.direction", "direction")
      .addSelect("SUM(entry.amount_minor)", "total")
      .where("entry.merchantId = :merchantId", { merchantId })
      .andWhere("entry.account = :account", { account })
      .groupBy("entry.direction")
      .getRawMany<{ direction: EntryDirection; total: string }>();
    let balance = 0;
    for (const row of rows) {
      const total = Number(row.total);
      balance += row.direction === EntryDirection.CREDIT ? total : -total;
    }
    return balance;
  }

  private assertBalancedInput(input: PostLedgerInput): void {
    if (input.entries.length < 2) {
      throw new BadRequestException({
        message: "A financial transaction requires at least two balanced entries",
        error: ApiErrorCode.LEDGER_UNBALANCED,
      });
    }
    let debitMinor = 0;
    let creditMinor = 0;
    for (const entry of input.entries) {
      if (!Number.isInteger(entry.amountMinor) || entry.amountMinor <= 0) {
        throw new BadRequestException({
          message: "Ledger entry amounts must be positive integers (minor units)",
          error: ApiErrorCode.LEDGER_UNBALANCED,
        });
      }
      if (entry.direction === EntryDirection.DEBIT) debitMinor += entry.amountMinor;
      else creditMinor += entry.amountMinor;
    }
    if (debitMinor !== creditMinor) {
      throw new BadRequestException({
        message: `Unbalanced transaction: debits ${debitMinor} != credits ${creditMinor}`,
        error: ApiErrorCode.LEDGER_UNBALANCED,
      });
    }
  }

  private async insertTransaction(
    manager: EntityManager,
    input: PostLedgerInput,
  ): Promise<FinancialTransaction> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const transactionCode = `FIN-${Math.floor(100000 + Math.random() * 900000)}`;
      try {
        const transaction = await manager.getRepository(FinancialTransaction).save(
          manager.getRepository(FinancialTransaction).create({
            transactionCode,
            type: input.type,
            status: FinancialTransactionStatus.POSTED,
            referenceType: input.referenceType ?? null,
            referenceId: input.referenceId ?? null,
            description: input.description ?? null,
            createdBy: input.createdBy ?? null,
          }),
        );
        await manager.getRepository(FinancialEntry).save(
          input.entries.map((entry) =>
            manager.getRepository(FinancialEntry).create({
              transactionId: transaction.id,
              account: entry.account,
              direction: entry.direction,
              amountMinor: entry.amountMinor,
              currency: CURRENCY_BDT,
              merchantId: entry.merchantId ?? null,
              memo: entry.memo ?? null,
            }),
          ),
        );
        const posted = await manager.findOne(FinancialTransaction, {
          where: { id: transaction.id },
          relations: ["entries"],
        });
        if (!posted) {
          throw new BadRequestException({
            message: "Failed to post financial transaction",
            error: ApiErrorCode.INTERNAL_SERVER_ERROR,
          });
        }
        this.logger.log(
          `LEDGER_POSTED type=${input.type} code=${transactionCode} ref=${input.referenceType ?? "-"}/${input.referenceId ?? "-"}`,
        );
        return posted;
      } catch (error) {
        if (error instanceof QueryFailedError) {
          const driverError = error.driverError as { code?: string };
          if (driverError?.code === PG_UNIQUE_VIOLATION) continue;
        }
        throw error;
      }
    }
    throw new ConflictException({
      message: "Could not issue a unique transaction code",
      error: ApiErrorCode.INTERNAL_SERVER_ERROR,
    });
  }
}
