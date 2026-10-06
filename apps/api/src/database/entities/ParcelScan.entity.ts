import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { HubScanType, ScanOutcome } from '@dhruto/contracts';

/**
 * Append-only hub scan log.
 *
 * Every scan attempt is recorded, whatever its outcome — including rejected and
 * duplicate scans — so physical parcel movement can always be reconciled
 * against digital records (docs/08-STATE-MACHINE.md §4).
 *
 * There is deliberately no `updatedAt` column: scan rows are never modified or
 * deleted. `idempotency_key` is unique so a resubmitted scan (scanner key
 * repeat, network retry, operator retry) cannot create a second row.
 */
@Entity('parcel_scans')
@Index(['parcelId', 'createdAt'])
@Index(['hubId', 'createdAt'])
@Index(['bagId'])
export class ParcelScan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Null when the scanned barcode could not be resolved to a parcel. */
  @Column({ name: 'parcel_id', type: 'uuid', nullable: true })
  parcelId: string | null;

  @Column({ name: 'bag_id', type: 'uuid', nullable: true })
  bagId: string | null;

  @Column({ name: 'hub_id', type: 'uuid' })
  hubId: string;

  @Column({ name: 'scan_type', type: 'enum', enum: HubScanType })
  scanType: HubScanType;

  @Column({ type: 'enum', enum: ScanOutcome })
  outcome: ScanOutcome;

  /** Machine-readable rejection/duplicate reason, e.g. WRONG_HUB. */
  @Column({ name: 'reason_code', type: 'varchar', length: 64, nullable: true })
  reasonCode: string | null;

  /** Raw scanned value exactly as submitted. */
  @Column({ type: 'varchar', length: 64 })
  barcode: string;

  @Column({ name: 'operator_id', type: 'uuid', nullable: true })
  operatorId: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 128, nullable: true })
  idempotencyKey: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
