import { ApiProperty } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
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
  @ValidateNested({ each: true })
  @Type(() => CreateParcelDto)
  rows: CreateParcelDto[];
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
