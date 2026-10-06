import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './Base.entity.js';
import { Manifest } from './Manifest.entity.js';
import { Bag } from './Bag.entity.js';

/**
 * A manifest line item.
 *
 * Bags are the primary transport aggregation, so a row normally references a
 * bag. `parcelId` is reserved for future direct-parcel manifests; a row must
 * reference exactly one of them (enforced by a CHECK constraint in the
 * migration).
 *
 * Replaces the Phase 0 `manifests.bag_ids` jsonb array, which could not be
 * foreign-keyed, joined or constrained.
 */
@Entity('manifest_items')
@Index(['manifestId', 'bagId'], { unique: true })
@Index(['bagId'])
export class ManifestItem extends BaseEntity {
  @Column({ name: 'manifest_id', type: 'uuid' })
  manifestId: string;

  @ManyToOne(() => Manifest, (manifest) => manifest.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'manifest_id' })
  manifest: Manifest;

  @Column({ name: 'bag_id', type: 'uuid', nullable: true })
  bagId: string | null;

  @ManyToOne(() => Bag, { nullable: true })
  @JoinColumn({ name: 'bag_id' })
  bag: Bag | null;

  /** Reserved for direct-parcel manifests (not used in Phase 2 workflows). */
  @Column({ name: 'parcel_id', type: 'uuid', nullable: true })
  parcelId: string | null;
}
