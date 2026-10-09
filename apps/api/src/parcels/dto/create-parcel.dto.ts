import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { BANGLADESH_PHONE_REGEX, normalizeBangladeshPhone, type ParcelBooking } from "@dhruto/contracts";

export class CreateParcelDto implements ParcelBooking {
  @ApiProperty({
    example: "Rahim Uddin",
    description: "Recipient full name (2-100 characters)",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "Recipient name must be a string" })
  @IsNotEmpty({ message: "Recipient name is required" })
  @MinLength(2, { message: "Recipient name must be at least 2 characters" })
  @MaxLength(100, { message: "Recipient name cannot exceed 100 characters" })
  recipientName: string;

  @ApiProperty({
    example: "01712345678",
    description: "Recipient 11-digit Bangladesh phone number",
  })
  @Transform(({ value }) => (typeof value === "string" ? normalizeBangladeshPhone(value.trim()) : value))
  @IsString({ message: "Recipient phone must be a string" })
  @IsNotEmpty({ message: "Recipient phone is required" })
  @Matches(BANGLADESH_PHONE_REGEX, {
    message: "Invalid Bangladesh mobile number (format: 01XXXXXXXXX, 11 digits)",
  })
  recipientPhone: string;

  @ApiProperty({ example: "Dhaka", description: "Delivery district" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "District must be a string" })
  @IsNotEmpty({ message: "District is required" })
  @MinLength(1, { message: "District is required" })
  @MaxLength(50, { message: "District cannot exceed 50 characters" })
  district: string;

  @ApiProperty({ example: "Dhanmondi", description: "Delivery thana/upazila" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "Thana/Upazila must be a string" })
  @IsNotEmpty({ message: "Thana/Upazila is required" })
  @MinLength(1, { message: "Thana/Upazila is required" })
  @MaxLength(50, { message: "Thana cannot exceed 50 characters" })
  thana: string;

  @ApiProperty({
    example: "House 12, Road 4, Dhanmondi, Dhaka",
    description: "Detailed street / building address (5-300 chars)",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "Delivery address must be a string" })
  @IsNotEmpty({ message: "Delivery address is required" })
  @MinLength(5, { message: "Delivery address must be at least 5 characters" })
  @MaxLength(300, { message: "Delivery address cannot exceed 300 characters" })
  deliveryAddress: string;

  @ApiPropertyOptional({
    example: "Fragile items, handle with care",
    description: "Optional notes for handling",
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "Parcel description must be a string" })
  @MaxLength(500, { message: "Parcel description cannot exceed 500 characters" })
  parcelDescription?: string;

  @ApiProperty({
    example: 1200,
    description: "Cash on delivery amount in BDT (0 for prepaid)",
  })
  @Type(() => Number)
  @IsNumber({}, { message: "COD amount must be a number" })
  @Min(0, { message: "COD amount cannot be negative" })
  @Max(500000, { message: "COD amount exceeds maximum limit of 500,000 BDT" })
  codAmount: number;

  @ApiProperty({ example: 1.5, description: "Weight in kilograms (> 0, <= 50 kg)" })
  @Type(() => Number)
  @IsNumber({}, { message: "Weight must be a number" })
  @IsPositive({ message: "Weight must be positive (greater than 0 kg)" })
  @Max(50, { message: "Weight exceeds maximum allowable limit of 50 kg" })
  weight: number;
}
