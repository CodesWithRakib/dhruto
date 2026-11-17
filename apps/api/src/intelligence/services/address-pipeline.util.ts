import {
  AddressMatchMethod,
  type AddressCandidate,
  type StructuredAddress,
} from "@dhruto/contracts";
import { levenshteinBounded, normalizeAddressText } from "../common/normalization.util.js";
import type { GeoDistrict } from "./geo-data.service.js";

export function fuzzyDistrict(districts: GeoDistrict[], tokens: string[]): { index: number } | null {
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

export function fuzzyThana(district: GeoDistrict | null | undefined, tokens: string[]): number | null {
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

export function extractArea(raw: string): string | null {
  const match = raw.match(/(?:sector|block|area| basha| road|lane)\s*[:#\d\w\s,/-]+/i);
  return match?.[0]?.trim().slice(0, 120) ?? null;
}

export function extractPattern(raw: string, pattern: RegExp): string | null {
  const match = raw.match(pattern);
  return match?.[1]?.trim().slice(0, 60) ?? null;
}

export function computeAddressConfidence(params: {
  district?: GeoDistrict | null;
  districtMethod: AddressMatchMethod;
  thana?: { name: string; postalCode?: string } | null;
  thanaMethod: AddressMatchMethod | null;
  postalCode: string | null;
  normalized: string;
  hasConflict: boolean;
}): number {
  const evidence: number[] = [];
  if (params.district) {
    evidence.push(
      params.districtMethod === AddressMatchMethod.EXACT
        ? 0.5
        : params.districtMethod === AddressMatchMethod.ALIAS
          ? 0.45
          : 0.25,
    );
  } else {
    evidence.push(0.05);
  }

  if (params.thana) {
    evidence.push(params.thanaMethod === AddressMatchMethod.FUZZY ? 0.28 : 0.35);
  } else {
    evidence.push(0.05);
  }

  if (params.postalCode) evidence.push(0.1);
  if (/\b(house|road|sector|block|lane|flat|holding)\b/.test(params.normalized)) evidence.push(0.05);

  let confidence = Math.min(
    1,
    evidence.reduce((a, b) => a + b, 0),
  );
  if (params.hasConflict) confidence = Math.max(0, confidence - 0.2);
  if (!params.district) confidence = Math.min(confidence, 0.3);
  return Math.round(confidence * 100) / 100;
}

export function buildAddressCandidates(params: {
  district?: GeoDistrict | null;
  thana?: { name: string; postalCode?: string } | null;
  confidence: number;
  thanaMethod: AddressMatchMethod | null;
  districtMethod: AddressMatchMethod;
  hasConflict: boolean;
  otherDistrictThanas: Array<{ districtIdx: number; thanaIdx: number }>;
  districts: GeoDistrict[];
  maxCandidates: number;
}): AddressCandidate[] {
  const candidates: AddressCandidate[] = [];
  if (params.district) {
    candidates.push({
      placeId: null,
      district: params.district.name,
      districtBn: params.district.nameBn,
      upazila: params.thana?.name ?? null,
      thana: params.thana?.name ?? null,
      division: params.district.division,
      confidence: params.confidence,
      matchedBy: params.thanaMethod ?? params.districtMethod,
      hasConflict: params.hasConflict,
    });
  }

  for (const hit of params.otherDistrictThanas.slice(
    0,
    Math.max(0, params.maxCandidates - candidates.length),
  )) {
    const alt = params.districts[hit.districtIdx];
    const altThana = alt?.thanas[hit.thanaIdx];
    if (!alt) continue;
    candidates.push({
      placeId: null,
      district: alt.name,
      districtBn: alt.nameBn,
      upazila: altThana?.name ?? null,
      thana: altThana?.name ?? null,
      division: alt.division,
      confidence: Math.max(0, Math.round((params.confidence - 0.25) * 100) / 100),
      matchedBy: AddressMatchMethod.ALIAS,
      hasConflict: true,
    });
  }

  return candidates;
}

export function buildStructuredAddress(params: {
  district?: GeoDistrict | null;
  thana?: { name: string; postalCode?: string } | null;
  rawAddress: string;
  postalCode: string | null;
}): StructuredAddress {
  return {
    division: params.district?.division ?? null,
    district: params.district?.name ?? null,
    upazila: params.thana?.name ?? null,
    thana: params.thana?.name ?? null,
    union: null,
    ward: null,
    municipality: null,
    cityCorporation: null,
    village: null,
    area: extractArea(params.rawAddress),
    road: extractPattern(params.rawAddress, /road\s*(?:no\.?|number)?\s*([a-z0-9/\- ]+)/i),
    house: extractPattern(params.rawAddress, /house\s*(?:no\.?|number|#)?\s*([a-z0-9/\- ]+)/i),
    building: null,
    flat: null,
    postalCode: params.postalCode ?? params.thana?.postalCode ?? null,
    landmark: null,
  };
}
