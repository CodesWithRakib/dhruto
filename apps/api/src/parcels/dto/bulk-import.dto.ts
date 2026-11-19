import { ApiProperty } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayMinSize, IsArray, validateSync } from "class-validator";
import { Transform, plainToInstance } from "class-transformer";
import { CreateParcelDto } from "./create-parcel.dto.js";

/**
 * Phase 6 (Q-BULK): JSON bulk import. The frontend converts CSV/XLSX files
 * to this shape (template via `GET /parcels/bulk/template`); per-row
 * validation reuses `CreateParcelDto`, so bulk rows obey the exact same
 * rules as single bookings. Tunables: MAX_BULK_ROWS (default 500).
 */
export const MAX_BULK_ROWS = 500;

export class BulkImportDto {
  @ApiProperty({ type: [CreateParcelDto] })
  @IsArray()
  @ArrayMinSize(1, { message: "At least one parcel row is required" })
  @ArrayMaxSize(MAX_BULK_ROWS, {
    message: `At most ${MAX_BULK_ROWS} parcel rows per request`,
  })
  // Rows are NOT validated here: nested validation made one bad row reject the
  // whole batch (422) before any row could import. Each row is validated on
  // its own with `validateBulkRow` and reported per row instead.
  // Keep the raw rows: the global pipe's implicit conversion would otherwise
  // coerce untyped elements before per-row validation sees them.
  @Transform(({ obj }: { obj: { rows?: unknown } }) => obj.rows, { toClassOnly: true })
  rows: unknown[];
}

/**
 * Validates one bulk row with exactly the single-booking rules
 * (`CreateParcelDto`). Returns the transformed DTO or readable messages.
 */
export function validateBulkRow(
  row: unknown,
): { ok: true; value: CreateParcelDto } | { ok: false; message: string } {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return { ok: false, message: "Row must be an object with parcel fields" };
  }
  const value = plainToInstance(CreateParcelDto, row, { enableImplicitConversion: true });
  const errors = validateSync(value, { whitelist: true, forbidNonWhitelisted: false });
  if (errors.length === 0) return { ok: true, value };
  const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
  return { ok: false, message: [...new Set(messages)].join("; ") };
}

export interface BulkRowResult {
  index: number;
  ok: boolean;
  parcelId?: string;
  trackingCode?: string;
  errorCode?: string;
  message?: string;
}

export interface BulkImportResult {
  total: number;
  created: number;
  failed: number;
  rows: BulkRowResult[];
}
