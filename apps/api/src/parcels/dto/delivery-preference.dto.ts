import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import type { DeliveryPreferenceRequest } from "@dhruto/contracts";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

/** Recipient delivery preference ("Reschedule"). Range checks live in the service. */
export class DeliveryPreferenceDto implements DeliveryPreferenceRequest {
  @ApiProperty({
    example: "2026-11-19",
    description: "Preferred delivery day (YYYY-MM-DD, Asia/Dhaka)",
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be YYYY-MM-DD" })
  date: string;

  @ApiProperty({ example: "02:00 PM - 05:00 PM" })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: "Time slot is required" })
  @MaxLength(40)
  slot: string;

  @ApiPropertyOptional({ example: "Leave with the building guard" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(300, { message: "Instruction cannot exceed 300 characters" })
  note?: string;
}
