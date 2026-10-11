import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { Transform } from "class-transformer";

export class RequestPickupDto {
  @ApiPropertyOptional({
    example: "Please call before arriving, warehouse gate #2",
    description: "Optional merchant pickup instructions or notes",
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "Notes must be a string" })
  @MaxLength(300, { message: "Notes cannot exceed 300 characters" })
  notes?: string;
}

export class BatchRequestPickupDto {
  @ApiProperty({
    example: ["11111111-1111-1111-1111-111111111111"],
    description: "Array of parcel UUIDs to request pickup for",
  })
  @IsArray({ message: "parcelIds must be an array" })
  @IsUUID("4", { each: true, message: "Each parcelId must be a valid UUID v4" })
  parcelIds!: string[];

  @ApiPropertyOptional({
    example: "Bulk pickup ready at front desk",
    description: "Optional notes for pickup request",
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "Notes must be a string" })
  @MaxLength(300, { message: "Notes cannot exceed 300 characters" })
  notes?: string;
}
