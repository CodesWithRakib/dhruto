import { type MigrationInterface, type QueryRunner } from "typeorm";

/**
 * Phase 4 - ledger adoption opening balances.
 *
 * Wallets credited before the journal existed carry balances with no
 * postings. For each such wallet this posts a single balanced OPENING_BALANCE
 * adjustment (DEBIT ADJUSTMENT / CREDIT MERCHANT_AVAILABLE, or the mirror for
 * negative gaps) so ledger-derived balances reconcile from day one. Naturally
 * idempotent: a second run computes a zero gap and posts nothing.
 */
export class Phase4LedgerOpeningBalances1700000000005 implements MigrationInterface {
  name = "Phase4LedgerOpeningBalances1700000000005";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        rec RECORD;
        gap_minor bigint;
        txn_id uuid;
        txn_code text;
      BEGIN
        FOR rec IN SELECT merchant_id, balance FROM wallets LOOP
          -- MERCHANT_AVAILABLE is credit-normal: derived = CREDITS - DEBITS.
          SELECT COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount_minor ELSE -amount_minor END), 0)
            INTO gap_minor
            FROM financial_entries
            WHERE merchant_id = rec.merchant_id AND account = 'MERCHANT_AVAILABLE';
          gap_minor := ROUND(rec.balance * 100) - gap_minor;

          IF gap_minor = 0 THEN
            CONTINUE;
          END IF;

          -- Skip wallets already adopted (an opening entry exists).
          PERFORM 1 FROM financial_transactions
            WHERE reference_type = 'OPENING_BALANCE' AND reference_id = rec.merchant_id::text
            LIMIT 1;
          IF FOUND THEN
            CONTINUE;
          END IF;

          txn_code := 'FOP' || to_char(now(), 'YYMMDDHH24MI')
            || lpad((floor(random() * 9000) + 1000)::text, 4, '0');
          INSERT INTO financial_transactions
            (id, "createdAt", "updatedAt", transaction_code, type, status,
             reference_type, reference_id, description, created_by)
            VALUES (uuid_generate_v4(), now(), now(), txn_code, 'ADJUSTMENT', 'POSTED',
              'OPENING_BALANCE', rec.merchant_id::text,
              'Phase 4 ledger adoption: opening balance true-up', NULL)
            RETURNING id INTO txn_id;

          IF gap_minor > 0 THEN
            INSERT INTO financial_entries
              (id, "createdAt", "updatedAt", transaction_id, account, direction,
               amount_minor, currency, merchant_id, memo)
            VALUES
              (uuid_generate_v4(), now(), now(), txn_id, 'ADJUSTMENT', 'DEBIT',
               gap_minor, 'BDT', NULL, 'Opening balance adoption'),
              (uuid_generate_v4(), now(), now(), txn_id, 'MERCHANT_AVAILABLE', 'CREDIT',
               gap_minor, 'BDT', rec.merchant_id, 'Opening balance adoption');
          ELSE
            INSERT INTO financial_entries
              (id, "createdAt", "updatedAt", transaction_id, account, direction,
               amount_minor, currency, merchant_id, memo)
            VALUES
              (uuid_generate_v4(), now(), now(), txn_id, 'MERCHANT_AVAILABLE', 'DEBIT',
               -gap_minor, 'BDT', rec.merchant_id, 'Opening balance adoption'),
              (uuid_generate_v4(), now(), now(), txn_id, 'ADJUSTMENT', 'CREDIT',
               -gap_minor, 'BDT', NULL, 'Opening balance adoption');
          END IF;
        END LOOP;
      END
      $$;
    `);
  }

  public async down(): Promise<void> {
    // Adoption entries are financial history: never auto-removed.
    return Promise.resolve();
  }
}
