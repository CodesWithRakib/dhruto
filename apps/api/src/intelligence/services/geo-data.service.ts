import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { DataSource } from "typeorm";
import { DeliveryZone } from "@dhruto/contracts";
import {
  BANGLADESH_DISTRICTS,
  GEO_DATASET_SOURCE,
  GEO_DATASET_VERSION,
  type DistrictInfo,
} from "../data/bangladesh-locations.js";
import { normalizeAddressText } from "../common/normalization.util.js";
import { importGeoPlaces, type GeoImportSummary } from "./geo-import.util.js";

export interface GeoDistrict {
  code: string;
  name: string;
  nameBn: string;
  division: string | null;
  zone: DeliveryZone;
  thanas: Array<{ name: string; nameBn: string; aliases: string[]; postalCode?: string }>;
  aliases: string[];
}

export interface GeoMatch {
  district: GeoDistrict;
  thana: { name: string; nameBn: string; aliases: string[]; postalCode?: string } | null;
  method: "EXACT" | "ALIAS" | "NORMALIZED" | "FUZZY";
}

/**
 * Authoritative geography service.
 *
 * The compiled dataset file is the source of truth; `ensureImported()` mirrors
 * it into `geo_places`/`address_aliases`/`geo_dataset_versions` idempotently
 * (code-keyed upserts, never deletes). Hot-path matching uses in-memory
 * normalized indexes built at startup — no per-request full-table scans.
 */
@Injectable()
export class GeoDataService implements OnModuleInit {
  private readonly logger = new Logger(GeoDataService.name);
  private districts: GeoDistrict[] = [];
  /** normalized alias -> district index */
  private districtAliasIndex = new Map<string, number>();
  /** normalized thana alias -> list of {districtIdx, thanaIdx} */
  private thanaAliasIndex = new Map<string, Array<{ districtIdx: number; thanaIdx: number }>>();

  constructor(private readonly dataSource: DataSource) {}

  get datasetVersion(): string {
    return GEO_DATASET_VERSION;
  }

  get source(): string {
    return GEO_DATASET_SOURCE;
  }

  async onModuleInit(): Promise<void> {
    this.buildIndexes();
  }

  districtCount(): number {
    return this.districts.length;
  }

  thanaCount(): number {
    return this.districts.reduce((n, d) => n + d.thanas.length, 0);
  }

  getDistricts(): GeoDistrict[] {
    return this.districts;
  }

  private buildIndexes(): void {
    this.districts = BANGLADESH_DISTRICTS.map((d: DistrictInfo, di: number) => ({
      code: d.code ?? `BD-XX-${String(di).padStart(3, "0")}`,
      name: d.name,
      nameBn: d.nameBn,
      division: d.division ?? null,
      zone: d.zone,
      aliases: [d.name, d.nameBn, ...d.aliases],
      thanas: d.thanas.map((t) => ({
        name: t.name,
        nameBn: t.nameBn,
        aliases: [t.name, t.nameBn, ...(t.aliases ?? [])],
        postalCode: t.postalCode,
      })),
    }));
    this.districtAliasIndex.clear();
    this.thanaAliasIndex.clear();
    this.districts.forEach((d, di) => {
      for (const alias of d.aliases) {
        const key = normalizeAddressText(alias);
        if (key && !this.districtAliasIndex.has(key)) this.districtAliasIndex.set(key, di);
      }
      d.thanas.forEach((t, ti) => {
        for (const alias of t.aliases) {
          const key = normalizeAddressText(alias);
          if (!key) continue;
          const list = this.thanaAliasIndex.get(key) ?? [];
          list.push({ districtIdx: di, thanaIdx: ti });
          this.thanaAliasIndex.set(key, list);
        }
      });
    });
    this.logger.log(
      `Geo indexes ready: ${this.districts.length} districts, ${this.thanaCount()} thanas (dataset ${GEO_DATASET_VERSION})`,
    );
  }

  /** Exact/alias district hit by substring over normalized aliases. */
  findDistrictInText(normalizedText: string): { index: number; method: "EXACT" | "ALIAS" } | null {
    for (const [alias, idx] of this.districtAliasIndex) {
      if (alias.length >= 3 && normalizedText.includes(alias)) {
        const district = this.districts[idx];
        const canonical = normalizeAddressText(district?.name ?? "");
        return { index: idx, method: alias === canonical ? "EXACT" : "ALIAS" };
      }
    }
    return null;
  }

  /** All thana hits in text (may span districts -> ambiguity signal). */
  findThanasInText(normalizedText: string): Array<{ districtIdx: number; thanaIdx: number }> {
    const hits: Array<{ districtIdx: number; thanaIdx: number }> = [];
    const seen = new Set<string>();
    for (const [alias, entries] of this.thanaAliasIndex) {
      if (alias.length >= 3 && normalizedText.includes(alias)) {
        for (const e of entries) {
          const key = `${e.districtIdx}:${e.thanaIdx}`;
          if (!seen.has(key)) {
            seen.add(key);
            hits.push(e);
          }
        }
      }
    }
    return hits;
  }

  thanaAliasEntries(normalizedAlias: string): Array<{ districtIdx: number; thanaIdx: number }> {
    return this.thanaAliasIndex.get(normalizedAlias) ?? [];
  }

  /**
   * Idempotent dataset import: upserts version row, division/district/upazila
   * places (code-keyed) and aliases (alias-keyed). Old versions are marked
   * SUPERSEDED, never deleted. Safe to re-run; reports counts.
   */
  async ensureImported(): Promise<GeoImportSummary> {
    return this.dataSource.transaction(async (manager) => {
      return importGeoPlaces(manager, this.districts, this.thanaCount());
    });
  }
}
