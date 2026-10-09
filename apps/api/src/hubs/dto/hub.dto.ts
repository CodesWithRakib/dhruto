import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import {
  HubScanType,
  type AddParcelToBagDto as IAddParcelToBagDto,
  type CreateBagDto as ICreateBagDto,
  type CreateManifestDto as ICreateManifestDto,
  type HubScanDto as IHubScanDto,
  type ReceiveManifestDto as IReceiveManifestDto,
  type ResolveExceptionDto as IResolveExceptionDto,
  type SealBagDto as ISealBagDto,
} from "@dhruto/contracts";

export class CreateBagDto implements ICreateBagDto {
  @ApiProperty({ example: "a0000000-0000-0000-0000-000000000001", format: "uuid" })
  @IsUUID("4", { message: "Invalid destination hub ID" })
  @IsNotEmpty({ message: "Invalid destination hub ID" })
  destinationHubId: string;

  @ApiPropertyOptional({ example: "SEAL-12345" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  sealTag?: string;

  @ApiPropertyOptional({ example: "Morning dispatch bag" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class AddParcelToBagDto implements IAddParcelToBagDto {
  @ApiProperty({ example: "DHR-20261008-ABC123" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: "Tracking code required" })
  @MinLength(3, { message: "Tracking code required" })
  @MaxLength(64)
  parcelTrackingCode: string;
}

export class SealBagDto implements ISealBagDto {
  @ApiProperty({ example: "SEAL-98765" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: "Seal tag identifier required" })
  @MinLength(2, { message: "Seal tag identifier required" })
  @MaxLength(100)
  sealTag: string;
}

export class CreateManifestDto implements ICreateManifestDto {
  @ApiProperty({ example: "a0000000-0000-0000-0000-000000000001", format: "uuid" })
  @IsUUID("4", { message: "Invalid destination hub ID" })
  @IsNotEmpty({ message: "Invalid destination hub ID" })
  destinationHubId: string;

  @ApiProperty({ example: ["b0000000-0000-0000-0000-000000000001"], type: [String] })
  @IsArray({ message: "Select at least one bag for manifest" })
  @ArrayMinSize(1, { message: "Select at least one bag for manifest" })
  @ArrayMaxSize(200)
  @IsUUID("4", { each: true, message: "Each bag ID must be a valid UUID" })
  bagIds: string[];

  @ApiProperty({ example: "DHAKA-METRO-TA-12-3456" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  vehicleNumber: string;

  @ApiPropertyOptional({ example: "Karim Driver" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(150)
  driverName?: string;

  @ApiPropertyOptional({ example: "01711223344" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(20)
  driverPhone?: string;

  @ApiPropertyOptional({ example: "Inter-hub route 1" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class HubScanDto implements IHubScanDto {
  @ApiProperty({ example: "DHR-20261008-ABC123" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: "Barcode required" })
  @MinLength(3, { message: "Barcode required" })
  @MaxLength(64)
  barcode: string;

  @ApiProperty({ enum: HubScanType })
  @IsEnum(HubScanType)
  scanType: HubScanType;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID("4")
  bagId?: string;

  @ApiPropertyOptional({ example: "Scan notes" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ example: "client-scan-12345" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  idempotencyKey?: string;
}

export class ReceiveManifestDto implements IReceiveManifestDto {
  @ApiProperty({ example: ["BAG-DHK-0001", "BAG-DHK-0002"], type: [String] })
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  scannedBagCodes: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  allowPartial: boolean = false;
}

export class ResolveExceptionDto implements IResolveExceptionDto {
  @ApiProperty({ example: "Parcel found in holding area and sorted correctly." })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(500)
  resolutionNote: string;
}
