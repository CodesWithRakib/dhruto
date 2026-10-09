/**
 * Phase 7: minimal RFC-4180 CSV parser for bulk import (no new dependency).
 * Handles quoted fields, escaped quotes (""), embedded commas/newlines and
 * CRLF. Returns rows as header-keyed records; caller maps to the booking
 * shape and lets the API validate (server is authoritative).
 */

export interface ParsedCsv {
  headers: string[];
  rows: Array<Record<string, string>>;
  errors: string[];
}

export function parseCsv(text: string): ParsedCsv {
  const errors: string[] = [];
  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  const clean = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") records.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (inQuotes) {
    errors.push("Unterminated quoted field in CSV");
    return { headers: [], rows: [], errors };
  }
  row.push(field);
  if (row.length > 1 || row[0] !== "") records.push(row);

  if (records.length === 0) {
    return { headers: [], rows: [], errors: ["CSV file is empty"] };
  }
  const headers = (records[0] as string[]).map((h) => h.trim());
  return {
    headers,
    rows: (records.slice(1) as string[][]).map((cells) => {
      const record: Record<string, string> = {};
      headers.forEach((h, idx) => {
        record[h] = (cells[idx] ?? "").trim();
      });
      return record;
    }),
    errors,
  };
}

/** Template columns served by `GET /parcels/bulk/template`. */
export const BULK_COLUMNS = [
  "recipientName",
  "recipientPhone",
  "district",
  "thana",
  "deliveryAddress",
  "parcelDescription",
  "codAmount",
  "weight",
] as const;

export interface BulkBookingRow {
  recipientName: string;
  recipientPhone: string;
  district: string;
  thana: string;
  deliveryAddress: string;
  parcelDescription?: string;
  codAmount: number;
  weight: number;
}

/** Maps a CSV record to a booking row; numeric coercion, no validation. */
export function toBulkRow(record: Record<string, string>): BulkBookingRow {
  const num = (v: string | undefined, fallback: number): number => {
    if (v === undefined || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  };
  const row: BulkBookingRow = {
    recipientName: record.recipientName ?? "",
    recipientPhone: record.recipientPhone ?? "",
    district: record.district ?? "",
    thana: record.thana ?? "",
    deliveryAddress: record.deliveryAddress ?? "",
    codAmount: num(record.codAmount, 0),
    weight: num(record.weight, 0),
  };
  if (record.parcelDescription) row.parcelDescription = record.parcelDescription;
  return row;
}
