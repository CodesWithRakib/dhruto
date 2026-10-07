import { describe, it, expect } from "vitest";
import {
  normalizeAddressText,
  tokenizeAddress,
  detectAddressLanguage,
  levenshteinBounded,
  tokenOverlap,
} from "./normalization.util.js";

describe("address normalization pipeline (deterministic)", () => {
  it("lowercases, folds punctuation and collapses whitespace", () => {
    expect(normalizeAddressText("House 12, Road-4;Sector 7")).toBe("house 12 road 4 sector 7");
    expect(normalizeAddressText("  Mirpur   10,,  Dhaka  ")).toBe("mirpur 10 dhaka");
  });

  it("folds Bangla digits to ASCII", () => {
    expect(normalizeAddressText("মিরপুর ১০, ঢাকা")).toBe("মিরপুর 10 ঢাকা");
  });

  it("expands common abbreviations", () => {
    expect(normalizeAddressText("dist. panchagarh")).toContain("district");
    expect(normalizeAddressText("Debiganj upz")).toContain("upazila");
    expect(normalizeAddressText("Sadar th. Barishal")).toContain("thana");
    expect(normalizeAddressText("12 rd 4")).toContain("road");
    expect(normalizeAddressText("vill. Char Fasson")).toContain("village");
  });

  it("is deterministic: same input → same output", () => {
    const input = "Bashundhara R/A, Block-A, Dhaka";
    expect(normalizeAddressText(input)).toBe(normalizeAddressText(input));
  });

  it("tokenizes on spaces without empties", () => {
    expect(tokenizeAddress("mirpur 10 dhaka")).toEqual(["mirpur", "10", "dhaka"]);
    expect(tokenizeAddress("")).toEqual([]);
  });

  it("detects EN/BN/MIXED script", () => {
    expect(detectAddressLanguage("Mirpur 10 Dhaka")).toBe("EN");
    expect(detectAddressLanguage("মিরপুর ১০ ঢাকা")).toBe("BN");
    expect(detectAddressLanguage("মিরপুর 10, Dhaka")).toBe("MIXED");
  });

  it("bounded levenshtein matches typos within distance 2", () => {
    expect(levenshteinBounded("dhanmandi", "dhanmondi", 2)).toBeLessThanOrEqual(2);
    expect(levenshteinBounded("dhka", "dhaka", 2)).toBeLessThanOrEqual(2);
    expect(levenshteinBounded("chittagong", "sylhet", 2)).toBeGreaterThan(2);
    expect(levenshteinBounded("abc", "xyz", 0)).toBeGreaterThan(0);
  });

  it("token overlap is order-insensitive 0..1", () => {
    expect(tokenOverlap(["mirpur", "dhaka"], ["dhaka", "mirpur"])).toBe(1);
    expect(tokenOverlap(["mirpur"], ["dhaka"])).toBe(0);
    expect(tokenOverlap([], ["dhaka"])).toBe(0);
  });
});
