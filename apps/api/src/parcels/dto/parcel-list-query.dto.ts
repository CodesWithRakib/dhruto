import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { PARCEL_LIST_SORT_FIELDS, ParcelStatus, type ParcelListQuery } from "@dhruto/contracts";

export class ParcelListQueryDto implements ParcelListQuery {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ enum: PARCEL_LIST_SORT_FIELDS, default: "createdAt" })
  @IsOptional()
  @IsIn(PARCEL_LIST_SORT_FIELDS)
  sort: (typeof PARCEL_LIST_SORT_FIELDS)[number] = "createdAt";

  @ApiPropertyOptional({ enum: ["ASC", "DESC"], default: "DESC" })
  @IsOptional()
  @IsIn(["ASC", "DESC"])
  order: "ASC" | "DESC" = "DESC";

  @ApiPropertyOptional({ enum: ParcelStatus })
  @IsOptional()
  @IsEnum(ParcelStatus)
  status?: ParcelStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  thana?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  cursor?: string;
}
