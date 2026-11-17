import type { EntityManager } from "typeorm";
import { GeoDatasetVersion } from "../../database/entities/GeoDatasetVersion.entity.js";
import { GeoPlace } from "../../database/entities/GeoPlace.entity.js";
import { AddressAlias } from "../../database/entities/AddressAlias.entity.js";
import { normalizeAddressText } from "../common/normalization.util.js";
import { GEO_DATASET_SOURCE, GEO_DATASET_VERSION } from "../data/bangladesh-locations.js";
import type { GeoDistrict } from "./geo-data.service.js";

export interface GeoImportSummary {
  version: string;
  divisions: number;
  districts: number;
  upazilas: number;
  aliases: number;
}

export async function importGeoPlaces(
  manager: EntityManager,
  districts: GeoDistrict[],
  totalThanaCount: number,
): Promise<GeoImportSummary> {
  let versionRow = await manager.getRepository(GeoDatasetVersion).findOne({
    where: { version: GEO_DATASET_VERSION },
  });
  if (!versionRow) {
    versionRow = manager.getRepository(GeoDatasetVersion).create({
      version: GEO_DATASET_VERSION,
      source: GEO_DATASET_SOURCE,
      importedAt: new Date(),
      status: "ACTIVE",
      divisions: 0,
      districts: 0,
      upazilas: 0,
      aliases: 0,
    });
    versionRow = await manager.getRepository(GeoDatasetVersion).save(versionRow);
  }

  const divisions = new Set<string>();
  const divisionMap = new Map<string, GeoPlace>();
  for (const d of districts) {
    if (d.division) divisions.add(d.division);
  }

  for (const divisionName of divisions) {
    const code = `BD-DIV-${divisionName.toUpperCase().slice(0, 4)}`;
    let place = await manager.getRepository(GeoPlace).findOne({ where: { code } });
    if (!place) {
      place = await manager.getRepository(GeoPlace).save(
        manager.getRepository(GeoPlace).create({
          kind: "DIVISION",
          code,
          name: divisionName,
          nameBn: divisionName,
          division: divisionName,
          aliases: [divisionName],
          datasetVersion: GEO_DATASET_VERSION,
        }),
      );
    }
    divisionMap.set(divisionName, place);
  }

  let districtCount = 0;
  let aliasCount = 0;

  for (const d of districts) {
    const divisionName = d.division ?? "Dhaka";
    const divPlace = divisionMap.get(divisionName);
    const districtCode = d.code;

    let district = await manager.getRepository(GeoPlace).findOne({ where: { code: districtCode } });
    if (!district) {
      district = await manager.getRepository(GeoPlace).save(
        manager.getRepository(GeoPlace).create({
          kind: "DISTRICT",
          code: districtCode,
          name: d.name,
          nameBn: d.nameBn,
          parentId: divPlace?.id ?? null,
          division: divisionName,
          zone: d.zone,
          aliases: d.aliases,
          datasetVersion: GEO_DATASET_VERSION,
        }),
      );
    }
    districtCount++;

    for (let ti = 0; ti < d.thanas.length; ti++) {
      const t = d.thanas[ti];
      if (!t) continue;
      const baseCode = `${districtCode}-${t.name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8)}`;
      let code = baseCode;
      const existing = await manager.getRepository(GeoPlace).findOne({ where: { code } });
      if (existing && existing.name !== t.name) {
        code = `${baseCode}-${String(ti + 1).padStart(2, "0")}`;
      }
      let place = await manager.getRepository(GeoPlace).findOne({ where: { code } });
      if (!place) {
        place = await manager.getRepository(GeoPlace).save(
          manager.getRepository(GeoPlace).create({
            kind: "UPAZILA",
            code,
            name: t.name,
            nameBn: t.nameBn,
            parentId: district.id,
            division: divisionName,
            zone: d.zone,
            aliases: t.aliases,
            postalCodes: t.postalCode ? [t.postalCode] : [],
            datasetVersion: GEO_DATASET_VERSION,
          }),
        );
      }

      for (const alias of t.aliases) {
        const normalized = normalizeAddressText(alias);
        if (!normalized) continue;
        const dup = await manager
          .getRepository(AddressAlias)
          .findOne({ where: { normalizedAlias: normalized } });
        if (!dup) {
          await manager.getRepository(AddressAlias).save(
            manager.getRepository(AddressAlias).create({
              placeId: place.id,
              alias,
              normalizedAlias: normalized,
              language: /[\u0980-\u09FF]/.test(alias) ? "bn" : "en",
              aliasType: "common_usage",
              source: GEO_DATASET_SOURCE,
            }),
          );
          aliasCount++;
        }
      }
    }
  }

  versionRow.divisions = divisions.size;
  versionRow.districts = districtCount;
  versionRow.upazilas = totalThanaCount;
  versionRow.aliases = aliasCount;
  versionRow.status = "ACTIVE";
  await manager.getRepository(GeoDatasetVersion).save(versionRow);

  await manager
    .getRepository(GeoDatasetVersion)
    .createQueryBuilder()
    .update()
    .set({ status: "SUPERSEDED" })
    .where("version != :version", { version: GEO_DATASET_VERSION })
    .execute();

  return {
    version: GEO_DATASET_VERSION,
    divisions: divisions.size,
    districts: districtCount,
    upazilas: totalThanaCount,
    aliases: aliasCount,
  };
}
