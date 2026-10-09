import { describe, it, expect } from "vitest";
import { shouldSeedDemoData } from "./auth.service.js";

/** Phase 3 (T-SEED-01): demo seed must never run unguarded in production. */
describe("shouldSeedDemoData (T-SEED-01)", () => {
  it("seeds in development", () => {
    expect(shouldSeedDemoData({ NODE_ENV: "development" } as NodeJS.ProcessEnv)).toBe(true);
  });

  it("seeds in test", () => {
    expect(shouldSeedDemoData({ NODE_ENV: "test" } as NodeJS.ProcessEnv)).toBe(true);
  });

  it("skips in production by default", () => {
    expect(shouldSeedDemoData({ NODE_ENV: "production" } as NodeJS.ProcessEnv)).toBe(false);
  });

  it("allows explicit production bootstrap via SEED_DEMO_DATA=true", () => {
    expect(
      shouldSeedDemoData({ NODE_ENV: "production", SEED_DEMO_DATA: "true" } as NodeJS.ProcessEnv),
    ).toBe(true);
  });
});
