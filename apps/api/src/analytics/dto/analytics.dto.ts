import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import {
  EXPORT_DATASETS,
  EXPORT_FORMATS,
  type AnalyticsPeriod,
  type AnalyticsQuery,
  type ExportDataset,
  type ExportFormat,
  type ExportRequest,
} from "@dhruto/contracts";

export class AnalyticsQueryDto implements AnalyticsQuery {
  @ApiPropertyOptional({ enum: ["7d", "30d", "90d", "custom"], default: "30d" })
  @IsOptional()
  @IsIn(["7d", "30d", "90d", "custom"])
  period: AnalyticsPeriod = "30d";

  @ApiPropertyOptional({ example: "2026-09-01" })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-10-01" })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID("4")
  merchantId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID("4")
  hubId?: string;
}

export const RANGE_PRESETS = [
  "today",
  "yesterday",
  "7d",
  "30d",
  "month",
  "last-month",
  "90d",
  "custom",
] as const;

export class AnalyticsRangeQueryDto {
  @ApiPropertyOptional({ enum: RANGE_PRESETS })
  @IsOptional()
  @IsIn(RANGE_PRESETS)
  preset?: (typeof RANGE_PRESETS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ example: "Asia/Dhaka" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID("4")
  hubId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID("4")
  riderId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID("4")
  merchantId?: string;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class ExportRequestDto implements ExportRequest {
  @ApiProperty({ enum: EXPORT_DATASETS })
  @IsIn(EXPORT_DATASETS)
  dataset: ExportDataset;

  @ApiPropertyOptional({ enum: EXPORT_FORMATS, default: "csv" })
  @IsOptional()
  @IsIn(EXPORT_FORMATS)
  format: ExportFormat = "csv";

  @ApiPropertyOptional({ enum: RANGE_PRESETS, default: "30d" })
  @IsOptional()
  @IsIn(RANGE_PRESETS)
  preset: (typeof RANGE_PRESETS)[number] = "30d";

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  to?: string;
}
