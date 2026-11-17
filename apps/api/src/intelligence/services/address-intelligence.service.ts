import { Injectable, Logger, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createHash } from "node:crypto";
import {
  ADDRESS_PARSER_VERSION,
  DEFAULT_CONFIDENCE_THRESHOLDS,
  AddressMatchMethod,
  type AddressParseV2Result,
} from "@dhruto/contracts";
import { AddressParse } from "../../database/entities/AddressParse.entity.js";
import { CacheService } from "../../common/cache/cache.service.js";
import { GeoDataService } from "./geo-data.service.js";
import {
  detectAddressLanguage,
  normalizeAddressText,
  tokenizeAddress,
} from "../common/normalization.util.js";
import { getErrorMessage } from "../../common/utils/error.util.js";
import {
  fuzzyDistrict,
  fuzzyThana,
  computeAddressConfidence,
  buildAddressCandidates,
  buildStructuredAddress,
} from "./address-pipeline.util.js";

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
        // Explicit district but thana belongs elsewhere: keep explicit district, flag conflict.
        thanaIdx = thanaHits[0].thanaIdx;
        thanaMethod = AddressMatchMethod.ALIAS;
      }
    }

    // Stage 4: bounded fuzzy fallback (tokens >= 4 chars, distance <= 2).
    const districts = this.geo.getDistricts();
    if (districtIdx === null) {
      const fuzzy = fuzzyDistrict(districts, tokens);
      if (fuzzy) {
        districtIdx = fuzzy.index;
        districtMethod = AddressMatchMethod.FUZZY;
      }
    }
    if (districtIdx !== null && thanaIdx === null) {
      const fuzzy = fuzzyThana(districts[districtIdx], tokens);
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

    // Stage 6: confidence 0..1 from evidence.
    const confidence = computeAddressConfidence({
      district,
      districtMethod,
      thana,
      thanaMethod,
      postalCode,
      normalized,
      hasConflict,
    });

    const candidates = buildAddressCandidates({
      district,
      thana,
      confidence,
      thanaMethod,
      districtMethod,
      hasConflict,
      otherDistrictThanas,
      districts,
      maxCandidates,
    });

    const structured = buildStructuredAddress({
      district,
      thana,
      rawAddress,
      postalCode,
    });

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
}
