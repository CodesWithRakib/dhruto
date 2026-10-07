import { describe, it, expect, beforeAll } from "vitest";
import { DataSource } from "typeorm";
import { AddressIntelligenceService } from "./address-intelligence.service.js";
import { GeoDataService } from "./geo-data.service.js";
import { ADDRESS_PARSER_VERSION, GEO_DATASET_VERSION } from "@dhruto/contracts";

describe("address intelligence pipeline (v2)", () => {
  let service: AddressIntelligenceService;
  let geo: GeoDataService;

  beforeAll(async () => {
    geo = new GeoDataService({} as DataSource);
    await geo.onModuleInit();
    const stubRepo = { save: async (row: unknown) => ({ ...(row as object), id: "parse-id-1" }) };
    service = new AddressIntelligenceService(geo, stubRepo as never, undefined);
  });

  it("covers all 64 districts", () => {
    expect(geo.districtCount()).toBe(64);
  });

  it("parses a Bangla address to Dhaka/Mirpur", async () => {
    const result = await service.parse("মিরপুর ১০, ঢাকা", { persist: false });
    expect(result.structuredAddress.district).toBe("Dhaka");
    expect(result.structuredAddress.thana).toBe("Mirpur");
    expect(result.language).toBe("BN");
    expect(result.parserVersion).toBe(ADDRESS_PARSER_VERSION);
    expect(result.datasetVersion).toBe(GEO_DATASET_VERSION);
  });

  it("resolves Debiganj, Panchagarh with hierarchy", async () => {
    const result = await service.parse("Debiganj, Panchagarh", { persist: false });
    expect(result.structuredAddress.district).toBe("Panchagarh");
    expect(result.structuredAddress.thana).toBe("Debiganj");
    expect(result.hasConflict).toBe(false);
  });

  it("handles historical and typo variants (dacca, dhanmandi, borishal)", async () => {
    const dacca = await service.parse("Dacca, Dhanmondi", { persist: false });
    expect(dacca.structuredAddress.district).toBe("Dhaka");
    const typo = await service.parse("dhanmandi dhka", { persist: false });
    expect(typo.structuredAddress.district).toBe("Dhaka");
    expect(typo.structuredAddress.thana).toBe("Dhanmondi");
    const barishal = await service.parse("Sadar Road, Borishal", { persist: false });
    expect(barishal.structuredAddress.district).toBe("Barisal");
  });

  it("detects hierarchy conflicts instead of guessing silently", async () => {
    const result = await service.parse("Debiganj, Dhaka", { persist: false });
    expect(result.hasConflict).toBe(true);
    expect(result.conflictDetail).toBeTruthy();
    expect(result.candidates.length).toBeGreaterThan(1);
    expect(result.requiresConfirmation).toBe(true);
  });

  it("flags low-confidence input for confirmation", async () => {
    const result = await service.parse("house, road, somewhere", { persist: false });
    expect(result.requiresConfirmation).toBe(true);
    expect(result.confidence).toBeLessThan(0.5);
  });

  it("scores precise addresses with high confidence", async () => {
    const result = await service.parse("House 12, Road 4, Sector 7, Uttara, Dhaka-1230", {
      persist: false,
    });
    expect(result.structuredAddress.district).toBe("Dhaka");
    expect(result.structuredAddress.thana).toBe("Uttara");
    expect(result.structuredAddress.postalCode).toBe("1230");
    expect(result.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it("is deterministic across repeated parses", async () => {
    const input = "Char Fasson, Bhola";
    const a = await service.parse(input, { persist: false });
    const b = await service.parse(input, { persist: false });
    expect(a).toEqual(b);
    expect(a.structuredAddress.district).toBe("Bhola");
    expect(a.structuredAddress.thana).toBe("Char Fasson");
  });
});
