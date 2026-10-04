import { Injectable } from "@nestjs/common";
import {
  type AddressParseResult,
  DeliveryZone,
} from "@dhruto/contracts";
import { BANGLADESH_DISTRICTS, DistrictInfo } from "../data/bangladesh-locations.js";

@Injectable()
export class AddressParserService {
  /**
   * Calculates Levenshtein distance between two strings with safe array indexing.
   */
  private levenshtein(a: string, b: string): number {
    const d: number[][] = Array.from({ length: b.length + 1 }, () =>
      new Array(a.length + 1).fill(0),
    );

    for (let i = 0; i <= b.length; i++) {
      const row = d[i];
      if (row) row[0] = i;
    }
    const firstRow = d[0];
    if (firstRow) {
      for (let j = 0; j <= a.length; j++) {
        firstRow[j] = j;
      }
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const prevRow = d[i - 1];
        const currentRow = d[i];
        if (!prevRow || !currentRow) continue;

        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          currentRow[j] = prevRow[j - 1] ?? 0;
        } else {
          const diag = (prevRow[j - 1] ?? 0) + 1;
          const left = (currentRow[j - 1] ?? 0) + 1;
          const up = (prevRow[j] ?? 0) + 1;
          currentRow[j] = Math.min(diag, Math.min(left, up));
        }
      }
    }

    const lastRow = d[b.length];
    return lastRow ? lastRow[a.length] ?? 0 : 0;
  }

  /**
   * Detects primary language of the address.
   */
  private detectLanguage(text: string): "EN" | "BN" | "MIXED" {
    const hasBengali = /[\u0980-\u09FF]/.test(text);
    const hasEnglish = /[a-zA-Z]/.test(text);

    if (hasBengali && hasEnglish) return "MIXED";
    if (hasBengali) return "BN";
    return "EN";
  }

  /**
   * Extracts 4-digit Bangladesh postal code if present.
   */
  private extractPostalCode(text: string): string | null {
    const match = text.match(/\b(1\d{3}|2\d{3}|3\d{3}|4\d{3}|5\d{3}|6\d{3}|7\d{3}|8\d{3}|9\d{3})\b/);
    return match && match[1] ? match[1] : null;
  }

  /**
   * Main parsing routine for free-form Bangladesh address text.
   */
  parse(rawAddress: string): AddressParseResult {
    const defaultDistrict: DistrictInfo = BANGLADESH_DISTRICTS[0] ?? {
      name: "Dhaka",
      nameBn: "ঢাকা",
      aliases: ["dhaka"],
      zone: DeliveryZone.INSIDE_DHAKA,
      thanas: [{ name: "Dhanmondi", nameBn: "ধানমন্ডি", postalCode: "1205" }],
    };

    if (!rawAddress || rawAddress.trim().length === 0) {
      return {
        rawAddress: "",
        district: defaultDistrict.name,
        thana: defaultDistrict.thanas[0]?.name || "Dhanmondi",
        area: null,
        postalCode: null,
        zone: DeliveryZone.INSIDE_DHAKA,
        confidenceScore: 0,
        confidenceTier: "LOW",
        language: "EN",
        matchedKeywords: [],
      };
    }

    const language = this.detectLanguage(rawAddress);
    const postalCode = this.extractPostalCode(rawAddress);
    const normalizedInput = rawAddress.toLowerCase();
    const matchedKeywords: string[] = [];
    const suggestions: string[] = [];

    let matchedDistrict: DistrictInfo | null = null;
    let matchedThana: { name: string; nameBn: string; postalCode?: string } | null = null;
    let districtScore = 0;
    let thanaScore = 0;

    // 1. Search for District
    for (const dist of BANGLADESH_DISTRICTS) {
      const allAliases = [
        dist.name.toLowerCase(),
        dist.nameBn,
        ...dist.aliases.map((a) => a.toLowerCase()),
      ];

      for (const alias of allAliases) {
        if (normalizedInput.includes(alias)) {
          matchedDistrict = dist;
          districtScore = 50;
          matchedKeywords.push(dist.name);
          break;
        }
      }
      if (matchedDistrict) break;
    }

    // 1b. Fuzzy search district if exact match failed
    if (!matchedDistrict) {
      const tokens = normalizedInput.replace(/[,.-]/g, " ").split(/\s+/).filter(Boolean);
      let bestDistDistance = 999;
      let candidateDist: DistrictInfo | null = null;

      for (const dist of BANGLADESH_DISTRICTS) {
        const distName = dist.name.toLowerCase();
        for (const token of tokens) {
          if (token.length >= 4) {
            const distVal = this.levenshtein(token, distName);
            if (distVal <= 2 && distVal < bestDistDistance) {
              bestDistDistance = distVal;
              candidateDist = dist;
            }
          }
        }
      }

      if (candidateDist && bestDistDistance <= 2) {
        matchedDistrict = candidateDist;
        districtScore = Math.max(25, 45 - bestDistDistance * 10);
        suggestions.push(`District auto-corrected to ${candidateDist.name}`);
        matchedKeywords.push(candidateDist.name);
      }
    }

    // Resolve final district
    const finalDistrict: DistrictInfo = matchedDistrict || defaultDistrict;
    if (!matchedDistrict) {
      districtScore = 15;
      suggestions.push("District assumed as Dhaka (Standard Fallback)");
    }

    // 2. Search for Thana
    for (const thana of finalDistrict.thanas) {
      const thanaAliases = [
        thana.name.toLowerCase(),
        thana.nameBn,
        ...(thana.aliases || []).map((a) => a.toLowerCase()),
      ];

      for (const alias of thanaAliases) {
        if (normalizedInput.includes(alias)) {
          matchedThana = thana;
          thanaScore = 35;
          matchedKeywords.push(thana.name);
          break;
        }
      }
      if (matchedThana) break;
    }

    // 2b. If not found in district thanas, search across all thanas in BD
    if (!matchedThana) {
      for (const dist of BANGLADESH_DISTRICTS) {
        for (const thana of dist.thanas) {
          const thanaAliases = [
            thana.name.toLowerCase(),
            thana.nameBn,
            ...(thana.aliases || []).map((a) => a.toLowerCase()),
          ];
          for (const alias of thanaAliases) {
            if (normalizedInput.includes(alias)) {
              matchedThana = thana;
              matchedDistrict = dist;
              districtScore = 45;
              thanaScore = 35;
              matchedKeywords.push(thana.name);
              suggestions.push(`Re-aligned district to ${dist.name} based on thana '${thana.name}'`);
              break;
            }
          }
          if (matchedThana) break;
        }
        if (matchedThana) break;
      }
    }

    // 2c. Fuzzy match thana
    if (!matchedThana) {
      const tokens = normalizedInput.replace(/[,.-]/g, " ").split(/\s+/).filter(Boolean);
      let bestThanaDistance = 999;
      let candidateThana: { name: string; nameBn: string; postalCode?: string } | null = null;

      for (const thana of finalDistrict.thanas) {
        const thanaLower = thana.name.toLowerCase();
        for (const token of tokens) {
          if (token.length >= 4) {
            const distVal = this.levenshtein(token, thanaLower);
            if (distVal <= 2 && distVal < bestThanaDistance) {
              bestThanaDistance = distVal;
              candidateThana = thana;
            }
          }
        }
      }

      if (candidateThana && bestThanaDistance <= 2) {
        matchedThana = candidateThana;
        thanaScore = Math.max(15, 30 - bestThanaDistance * 8);
        suggestions.push(`Thana auto-corrected to ${candidateThana.name}`);
        matchedKeywords.push(candidateThana.name);
      }
    }

    // Resolve final thana
    const defaultThana = finalDistrict.thanas[0] ?? {
      name: "Dhanmondi",
      nameBn: "ধানমন্ডি",
      postalCode: "1205",
    };
    const finalThana = matchedThana || defaultThana;
    if (!matchedThana) {
      thanaScore = 10;
    }

    // 3. Area / Landmark / Postal bonus
    let areaScore = 0;
    if (postalCode) {
      areaScore += 10;
      matchedKeywords.push(`Postal: ${postalCode}`);
    }

    const hasDetailedAddress =
      /\b(house|road|sector|block|lane|avenue|flat|বাড়ি|রোড|সেক্টর|ব্লক|মহল্লা)\b/i.test(
        rawAddress,
      );
    if (hasDetailedAddress) {
      areaScore += 5;
    }

    const confidenceScore = Math.min(100, districtScore + thanaScore + areaScore);
    const confidenceTier =
      confidenceScore >= 80 ? "HIGH" : confidenceScore >= 55 ? "MEDIUM" : "LOW";

    const areaMatch = rawAddress.match(
      /(?:house|road|sector|block|বাড়ি|রোড|সেক্টর)\s*[:#\d\w\s,-]+/i,
    );
    const area = areaMatch ? areaMatch[0]?.trim() || null : null;

    return {
      rawAddress,
      district: finalDistrict.name,
      thana: finalThana.name,
      area,
      postalCode: postalCode || finalThana.postalCode || null,
      zone: finalDistrict.zone,
      confidenceScore,
      confidenceTier,
      language,
      suggestedCorrections: suggestions,
      matchedKeywords,
    };
  }
}
