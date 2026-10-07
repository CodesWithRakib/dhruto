import { Injectable, Logger, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createHash } from "node:crypto";
import {
  ADDRESS_PARSER_VERSION,
  DEFAULT_CONFIDENCE_THRESHOLDS,
  AddressMatchMethod,
  type AddressCandidate,
  type AddressParseV2Result,
  type StructuredAddress,
} from "@dhruto/contracts";
import { AddressParse } from "../../database/entities/AddressParse.entity.js";
import { CacheService } from "../../common/cache/cache.service.js";
import { GeoDataService } from "./geo-data.service.js";
import {
  detectAddressLanguage,
  levenshteinBounded,
  normalizeAddressText,
  tokenizeAddress,
} from "../common/normalization.util.js";
import { getErrorMessage } from "../../common/utils/error.util.js";

const CACHE_TTL_SECONDS = 3600;

export interface ParseOptions {
  districtHint?: string;
  maxCandidates?: number;
  parcelId?: string;
  persist?: boolean;
}

/**
 * Staged address intelligence pipeline (v2).
 *
 * Exact → alias → token → fuzzy → hierarchy validation → confidence.
 * Deterministic: same input + same parser/dataset version → same result.
 * Original text is preserved; low-confidence/ambiguous results require human
 * confirmation instead of guessing.
 */
@Injectable()
export class AddressIntelligenceService {
  readonly parserVersion = ADDRESS_PARSER_VERSION;
  private readonly logger = new Logger(AddressIntelligenceService.name);

  constructor(
    private readonly geo: GeoDataService,
    @InjectRepository(AddressParse)
    private readonly parseRepo: Repository<AddressParse>,
    @Optional() private readonly cache?: CacheService,
  ) {}

  get datasetVersion(): string {
    return this.geo.datasetVersion;
  }

  async parse(rawAddress: string, opts: ParseOptions = {}): Promise<AddressParseV2Result> {
    const normalized = normalizeAddressText(rawAddress);
    const hash = createHash("sha256")
      .update(`${this.parserVersion}:${this.datasetVersion}:${normalized}`)
      .digest("hex");
    const cacheKey = `address-parser:${this.parserVersion}:${this.datasetVersion}:${hash}`;

    if (this.cache) {
      try {
        const cached = await this.cache.get<AddressParseV2Result>(cacheKey);
        if (cached) return cached;
      } catch (error) {
        this.logger.warn(`Parse cache read failed: ${getErrorMessage(error, "unknown")}`);
      }
    }

    const result = this.runPipeline(rawAddress, normalized, opts);

    if (opts.persist !== false) {
      try {
        const saved = await this.parseRepo.save(
          this.parseRepo.create({
            parcelId: opts.parcelId ?? null,
            originalAddress: rawAddress,
            normalizedAddress: normalized,
            normalizedHash: hash,
            structured: result.structuredAddress as unknown as Record<string, unknown>,
            confidence: result.confidence,
            matchedBy: result.matchedBy,
            hasConflict: result.hasConflict,
            conflictDetail: result.conflictDetail,
            candidates: result.candidates as unknown as Record<string, unknown>[],
            parserVersion: result.parserVersion,
            datasetVersion: result.datasetVersion,
            language: result.language,
          }),
        );
        result.parseId = saved.id;
      } catch (error) {
        // Persistence is observability, not the transaction — never fail parsing.
        this.logger.warn(`Parse persist failed: ${getErrorMessage(error, "unknown")}`);
      }
    }

    if (this.cache) {
      try {
        await this.cache.set(cacheKey, result, CACHE_TTL_SECONDS);
      } catch (error) {
        this.logger.warn(`Parse cache write failed: ${getErrorMessage(error, "unknown")}`);
      }
    }
    return result;
  }

  private runPipeline(
    rawAddress: string,
    normalized: string,
    opts: ParseOptions,
  ): AddressParseV2Result {
    const language = detectAddressLanguage(rawAddress);
    const tokens = tokenizeAddress(normalized);
    const maxCandidates = Math.min(10, Math.max(1, opts.maxCandidates ?? 5));

    const postalMatch = normalized.match(/\b([1-9]\d{3})\b/);
    const postalCode = postalMatch?.[1] ?? null;

    // Stage 1-2: district exact/alias hit.
    const districtHit = this.geo.findDistrictInText(` ${normalized} `);
    // Stage 3: thana hits across all districts (ambiguity detection).
    const thanaHits = this.geo.findThanasInText(` ${normalized} `);

    let districtIdx: number | null = districtHit?.index ?? null;
    let districtMethod: AddressMatchMethod = districtHit
      ? districtHit.method === "EXACT"
        ? AddressMatchMethod.EXACT
        : AddressMatchMethod.ALIAS
      : AddressMatchMethod.NORMALIZED;
    let thanaIdx: number | null = null;
    let thanaMethod: AddressMatchMethod | null = null;

    // Prefer a thana hit inside the matched district; otherwise re-align.
    if (thanaHits.length > 0) {
      const inDistrict =
        districtIdx !== null ? thanaHits.filter((h) => h.districtIdx === districtIdx) : [];
      if (inDistrict.length > 0 && inDistrict[0]) {
        thanaIdx = inDistrict[0].thanaIdx;
        thanaMethod = AddressMatchMethod.ALIAS;
      } else if (thanaHits[0] && districtHit === null) {
        // No explicit district: the thana implies its district.
        districtIdx = thanaHits[0].districtIdx;
        districtMethod = AddressMatchMethod.HIERARCHY_INFERRED;
        thanaIdx = thanaHits[0].thanaIdx;
        thanaMethod = AddressMatchMethod.ALIAS;
      } else if (thanaHits[0]) {
        // Explicit district but thana belongs elsewhere: keep the explicit
        // district, attach the thana, and flag the hierarchy conflict below
        // instead of silently switching districts.
        thanaIdx = thanaHits[0].thanaIdx;
        thanaMethod = AddressMatchMethod.ALIAS;
      }
    }

    // Stage 4: bounded fuzzy fallback (tokens ≥4 chars, distance ≤2).
    if (districtIdx === null) {
      const fuzzy = this.fuzzyDistrict(tokens);
      if (fuzzy) {
        districtIdx = fuzzy.index;
        districtMethod = AddressMatchMethod.FUZZY;
      }
    }
    if (districtIdx !== null && thanaIdx === null) {
      const fuzzy = this.fuzzyThana(districtIdx, tokens);
      if (fuzzy !== null) {
        thanaIdx = fuzzy;
        thanaMethod = AddressMatchMethod.FUZZY;
      }
    }

    // District hint narrows ambiguity (merchant-provided district field).
    if (opts.districtHint && districtIdx === null) {
      const hintHit = this.geo.findDistrictInText(` ${normalizeAddressText(opts.districtHint)} `);
      if (hintHit) {
        districtIdx = hintHit.index;
        districtMethod = AddressMatchMethod.HIERARCHY_INFERRED;
      }
    }

    const districts = this.geo.getDistricts();
    const district = districtIdx !== null ? districts[districtIdx] : null;
    const thana =
      district && thanaIdx !== null && thanaIdx < district.thanas.length
        ? district.thanas[thanaIdx]
        : null;

    // Stage 5: hierarchy validation + conflict detection.
    let hasConflict = false;
    let conflictDetail: string | null = null;
    const otherDistrictThanas = thanaHits.filter((h) => h.districtIdx !== districtIdx);
    if (districtIdx !== null && otherDistrictThanas.length > 0) {
      const other = districts[otherDistrictThanas[0]?.districtIdx ?? -1];
      if (other && other.name !== district?.name) {
        hasConflict = true;
        conflictDetail = `Thana-level token also matches ${other.name}; kept ${district?.name} by hierarchy priority.`;
      }
    }

    // Stage 6: confidence 0..1 from evidence (no fake precision — 2dp).
    const evidence: number[] = [];
    if (district) evidence.push(districtMethod === AddressMatchMethod.EXACT ? 0.5 : districtMethod === AddressMatchMethod.ALIAS ? 0.45 : 0.25);
    else evidence.push(0.05);
    if (thana) evidence.push(thanaMethod === AddressMatchMethod.FUZZY ? 0.28 : 0.35);
    else evidence.push(0.05);
    if (postalCode) evidence.push(0.1);
    if (/\b(house|road|sector|block|lane|flat|holding)\b/.test(normalized)) evidence.push(0.05);
    let confidence = Math.min(1, evidence.reduce((a, b) => a + b, 0));
    if (hasConflict) confidence = Math.max(0, confidence - 0.2);
    if (!district) confidence = Math.min(confidence, 0.3);
    confidence = Math.round(confidence * 100) / 100;

    // Candidates: winner + alternate-district thana matches (never guess silently).
    const candidates: AddressCandidate[] = [];
    if (district) {
      candidates.push({
        placeId: null,
        district: district.name,
        districtBn: district.nameBn,
        upazila: thana?.name ?? null,
        thana: thana?.name ?? null,
        division: district.division,
        confidence,
        matchedBy: thanaMethod ?? districtMethod,
        hasConflict,
      });
    }
    for (const hit of otherDistrictThanas.slice(0, Math.max(0, maxCandidates - candidates.length))) {
      const alt = districts[hit.districtIdx];
      const altThana = alt?.thanas[hit.thanaIdx];
      if (!alt) continue;
      candidates.push({
        placeId: null,
        district: alt.name,
        districtBn: alt.nameBn,
        upazila: altThana?.name ?? null,
        thana: altThana?.name ?? null,
        division: alt.division,
        confidence: Math.max(0, Math.round((confidence - 0.25) * 100) / 100),
        matchedBy: AddressMatchMethod.ALIAS,
        hasConflict: true,
      });
    }

    const structured: StructuredAddress = {
      division: district?.division ?? null,
      district: district?.name ?? null,
      upazila: thana?.name ?? null,
      thana: thana?.name ?? null,
      union: null,
      ward: null,
      municipality: null,
      cityCorporation: null,
      village: null,
      area: this.extractArea(rawAddress),
      road: this.extractPattern(rawAddress, /road\s*(?:no\.?|number)?\s*([a-z0-9/\- ]+)/i),
      house: this.extractPattern(rawAddress, /house\s*(?:no\.?|number|#)?\s*([a-z0-9/\- ]+)/i),
      building: null,
      flat: null,
      postalCode: postalCode ?? thana?.postalCode ?? null,
      landmark: null,
      // Note: union/ward/municipality/village await dataset depth beyond upazila.
    };

    const requiresConfirmation =
      confidence < DEFAULT_CONFIDENCE_THRESHOLDS.confirm ||
      hasConflict ||
      candidates.length > 1 ||
      !district;

    return {
      originalAddress: rawAddress,
      normalizedAddress: normalized,
      structuredAddress: structured,
      confidence,
      matchedBy: thanaMethod ?? districtMethod,
      hasConflict,
      conflictDetail,
      parserVersion: this.parserVersion,
      datasetVersion: this.datasetVersion,
      language,
      candidates: candidates.slice(0, maxCandidates),
      requiresConfirmation,
    };
  }

  private fuzzyDistrict(tokens: string[]): { index: number } | null {
    const districts = this.geo.getDistricts();
    let best = -1;
    let bestDist = 3;
    districts.forEach((d, i) => {
      const name = normalizeAddressText(d.name);
      for (const token of tokens) {
        if (token.length < 4) continue;
        const dist = levenshteinBounded(token, name, 2);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
    });
    return best >= 0 ? { index: best } : null;
  }

  private fuzzyThana(districtIdx: number, tokens: string[]): number | null {
    const district = this.geo.getDistricts()[districtIdx];
    if (!district) return null;
    let best = -1;
    let bestDist = 3;
    district.thanas.forEach((t, i) => {
      const name = normalizeAddressText(t.name);
      for (const token of tokens) {
        if (token.length < 4) continue;
        const dist = levenshteinBounded(token, name, 2);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
    });
    return best >= 0 ? best : null;
  }

  private extractArea(raw: string): string | null {
    const match = raw.match(/(?:sector|block|area| basha| road|lane)\s*[:#\d\w\s,/-]+/i);
    return match?.[0]?.trim().slice(0, 120) ?? null;
  }

  private extractPattern(raw: string, pattern: RegExp): string | null {
    const match = raw.match(pattern);
    return match?.[1]?.trim().slice(0, 60) ?? null;
  }
}
