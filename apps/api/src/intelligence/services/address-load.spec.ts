import { describe, it, expect, beforeAll } from "vitest";
import { DataSource } from "typeorm";
import { AddressIntelligenceService } from "./address-intelligence.service.js";
import { GeoDataService } from "./geo-data.service.js";

/**
 * Load profile for the deterministic parser (in-memory, no DB/Redis).
 * Records average/p95 over mixed exact/fuzzy/ambiguous inputs.
 * Scale: 1,000 parses (100-address corpus × 10). CI-friendly (<30s).
 */
describe("address parse load profile", () => {
  let service: AddressIntelligenceService;

  const corpus = [
    "House 12, Road 4, Sector 7, Uttara, Dhaka-1230",
    "মিরপুর ১০, ঢাকা",
    "Debiganj, Panchagarh",
    "Char Fasson, Bhola",
    "dhanmandi dhka",
    "Sadar Road, Borishal",
    "Agrabad, Chittagong",
    "Zindabazar, Sylhet",
    "House 5, Road 2, Dhanmondi, Dhaka-1205",
    "Debiganj, Dhaka",
  ];

  beforeAll(async () => {
    const geo = new GeoDataService({} as DataSource);
    await geo.onModuleInit();
    const stubRepo = { save: async (row: unknown) => ({ ...(row as object), id: "x" }) };
    service = new AddressIntelligenceService(geo, stubRepo as never, undefined);
  });

  it("parses 1,000 mixed addresses within budget and reports profile", async () => {
    const latencies: number[] = [];
    for (let round = 0; round < 100; round++) {
      for (const input of corpus) {
        const start = performance.now();
        await service.parse(input, { persist: false });
        latencies.push(performance.now() - start);
      }
    }
    expect(latencies).toHaveLength(1000);
    latencies.sort((a, b) => a - b);
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p50 = latencies[500] ?? 0;
    const p95 = latencies[950] ?? 0;
    const p99 = latencies[990] ?? 0;
    // eslint-disable-next-line no-console
    console.log(
      `parse-load n=1000 avg=${avg.toFixed(3)}ms p50=${p50.toFixed(3)}ms p95=${p95.toFixed(3)}ms p99=${p99.toFixed(3)}ms`,
    );
    expect(avg).toBeLessThan(10);
    expect(p95).toBeLessThan(50);
  });
});
