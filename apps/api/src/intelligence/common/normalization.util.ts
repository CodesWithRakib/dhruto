/**
 * Deterministic address normalization pipeline.
 *
 * Same input + same dataset/parser version always yields the same output.
 * No network, no randomness, no timestamps inside the transform.
 */

const BN_DIGITS: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

/** Common abbreviation → expansion (data-driven table, not scattered literals). */
const ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bdist\.?\b/gi, "district"],
  [/\bupz\.?\b/gi, "upazila"],
  [/\bth\.?\b/gi, "thana"],
  [/\brd\.?\b/gi, "road"],
  [/\bvill?\.?\b/gi, "village"],
  [/\bsec\.?\b/gi, "sector"],
  [/\bbl?k\.?\b/gi, "block"],
  [/\bh\.?\s*no\.?\b/gi, "house"],
  [/\brd\s*no\.?\b/gi, "road"],
];

const PUNCTUATION = /[।,.;:#/\\()[\]{}"']/g;

/** Unicode NFC + Bangla digit folding + lowercase + punctuation/space folding. */
export function normalizeAddressText(raw: string): string {
  let text = raw.normalize("NFC");
  text = text.replace(/[০-৯]/g, (d) => BN_DIGITS[d] ?? d);
  text = text.toLowerCase();
  text = text.replace(PUNCTUATION, " ");
  for (const [pattern, expansion] of ABBREVIATIONS) {
    text = text.replace(pattern, expansion);
  }
  // Collapse whitespace; trim. Hyphen runs become spaces for token parity.
  text = text.replace(/[-–—]+/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

export function tokenizeAddress(normalized: string): string[] {
  if (!normalized) return [];
  return normalized.split(" ").filter((t) => t.length > 0);
}

/** sha256 hex of the normalized text (cache keys, parse dedup). */
export async function hashNormalized(normalized: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(normalized).digest("hex");
}

export function detectAddressLanguage(raw: string): "EN" | "BN" | "MIXED" {
  const hasBengali = /[\u0980-\u09FF]/.test(raw);
  const hasEnglish = /[a-zA-Z]/.test(raw);
  if (hasBengali && hasEnglish) return "MIXED";
  if (hasBengali) return "BN";
  return "EN";
}

/** Bounded Levenshtein (early exit past maxDistance). */
export function levenshteinBounded(a: string, b: string, maxDistance = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;
  const prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let current0 = i;
    const current: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      const next = Math.min(
        (prev[j] ?? maxDistance + 1) + 1,
        current0 + 1,
        (prev[j - 1] ?? maxDistance + 1) + cost,
      );
      current.push(next);
      current0 = next;
    }
    if (Math.min(...current) > maxDistance) return maxDistance + 1;
    for (let j = 0; j <= b.length; j++) prev[j] = current[j] ?? maxDistance + 1;
  }
  return prev[b.length] ?? maxDistance + 1;
}

/** Token overlap ratio 0..1 (order-insensitive). */
export function tokenOverlap(aTokens: string[], bTokens: string[]): number {
  if (aTokens.length === 0 || bTokens.length === 0) return 0;
  const bSet = new Set(bTokens);
  const hits = aTokens.filter((t) => bSet.has(t)).length;
  return hits / Math.max(aTokens.length, bTokens.length);
}
