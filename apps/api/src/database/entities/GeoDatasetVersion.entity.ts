import { Entity, Column } from 'typeorm';
import { BaseEntity } from './Base.entity.js';

/**
 * Versioned geography dataset import record.
 *
 * The authoritative Bangladesh geography lives in versioned data files; each
 * import is recorded here with counts and provenance. Dataset rows are never
 * silently replaced — a new import creates a new version and supersedes the old.
 */
@Entity('geo_dataset_versions')
export class GeoDatasetVersion extends BaseEntity {
  @Column({ type: 'varchar', length: 64, unique: true })
  version: string;

  @Column({ type: 'varchar', length: 255 })
  source: string;

  @Column({ name: 'imported_at', type: 'timestamptz' })
  importedAt: Date;

  @Column({ type: 'int', default: 0 })
  divisions: number;

  @Column({ type: 'int', default: 0 })
  districts: number;

  @Column({ type: 'int', default: 0 })
  upazilas: number;

  @Column({ type: 'int', default: 0 })
  aliases: number;

  @Column({ type: 'varchar', length: 16, default: 'ACTIVE' })
  status: 'ACTIVE' | 'SUPERSEDED';
}
