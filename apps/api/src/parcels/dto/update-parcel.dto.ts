import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { BANGLADESH_PHONE_REGEX, normalizeBangladeshPhone } from "@dhruto/contracts";

export class UpdateParcelDto {
  @ApiPropertyOptional({
    example: "Rahim Uddin",
    description: "Recipient full name (2-100 characters)",
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "Recipient name must be a string" })
  @MinLength(2, { message: "Recipient name must be at least 2 characters" })
  @MaxLength(100, { message: "Recipient name cannot exceed 100 characters" })
  recipientName?: string;

  @ApiPropertyOptional({
    example: "01712345678",
    description: "Recipient 11-digit Bangladesh phone number",
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? normalizeBangladeshPhone(value.trim()) : value))
  @IsString({ message: "Recipient phone must be a string" })
  @Matches(BANGLADESH_PHONE_REGEX, {
    message: "Invalid Bangladesh mobile number (format: 01XXXXXXXXX, 11 digits)",
  })
  recipientPhone?: string;

  @ApiPropertyOptional({
    example: "House 12, Road 4, Dhanmondi, Dhaka",
    description: "Detailed street / building address (5-300 chars)",
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "Delivery address must be a string" })
  @MinLength(5, { message: "Delivery address must be at least 5 characters" })
  @MaxLength(300, { message: "Delivery address cannot exceed 300 characters" })
  deliveryAddress?: string;

  @ApiPropertyOptional({
    example: "Handle with care, call before delivery",
    description: "Optional merchant delivery notes (max 500 characters)",
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "Notes must be a string" })
  @MaxLength(500, { message: "Notes cannot exceed 500 characters" })
  notes?: string;
}
