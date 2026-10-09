import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import {
  type AddressConfirmRequest,
  type AddressParseRequest,
  type AddressParseV2Request,
  type IntelligenceFeedbackInput,
  type RecipientRiskEvaluateRequest,
  type RecommendationOverrideRequest,
  type StructuredAddress,
} from "@dhruto/contracts";

export class AddressParseDto implements AddressParseRequest {
  @ApiProperty({
    example: "House 12, Road 4, Dhanmondi, Dhaka",
    description: "Raw unformatted Bengali or English address string",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "Address must be a string" })
  @IsNotEmpty({ message: "Address is required" })
  @MinLength(3, { message: "Address must be at least 3 characters" })
  @MaxLength(500, { message: "Address cannot exceed 500 characters" })
  rawAddress: string;
}

export class RecipientRiskEvaluateDto implements RecipientRiskEvaluateRequest {
  @ApiProperty({ example: "01712345678" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "Phone number must be a string" })
  @IsNotEmpty({ message: "Phone number is required" })
  @MinLength(10, { message: "Phone number is required" })
  recipientPhone: string;

  @ApiProperty({ example: 1500 })
  @Type(() => Number)
  @IsNumber({}, { message: "COD amount must be a number" })
  @Min(0, { message: "COD amount cannot be negative" })
  codAmount: number;

  @ApiProperty({ example: "House 12, Road 4, Dhanmondi, Dhaka" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "Delivery address must be a string" })
  @IsNotEmpty({ message: "Delivery address is required" })
  @MinLength(3, { message: "Delivery address is required" })
  rawAddress: string;

  @ApiPropertyOptional({ example: "Dhaka" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: "Dhanmondi" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  thana?: string;

  @ApiPropertyOptional({ example: 1.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weight?: number;
}

export class AddressParseV2Dto implements AddressParseV2Request {
  @ApiProperty({ example: "House 12, Road 4, Dhanmondi, Dhaka" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: "Address is required" })
  @MinLength(3, { message: "Address must be at least 3 characters" })
  @MaxLength(500)
  rawAddress: string;

  @ApiPropertyOptional({ example: "Dhaka" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  districtHint?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeCandidates: boolean = true;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  maxCandidates: number = 5;
}

export class StructuredAddressDto implements StructuredAddress {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  division: string | null = null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  district: string | null = null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  upazila: string | null = null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  thana: string | null = null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  union: string | null = null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  ward: string | null = null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  municipality: string | null = null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  cityCorporation: string | null = null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  village: string | null = null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  area: string | null = null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  road: string | null = null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  house: string | null = null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  building: string | null = null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  flat: string | null = null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  postalCode: string | null = null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  landmark: string | null = null;
}

export class AddressConfirmDto implements AddressConfirmRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID("4")
  @IsNotEmpty()
  parseId: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9)
  candidateIndex?: number;

  @ApiPropertyOptional({ type: StructuredAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StructuredAddressDto)
  manualStructure?: StructuredAddressDto;

  @ApiPropertyOptional({ example: "Verified delivery location with recipient" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RecommendationOverrideDto implements RecommendationOverrideRequest {
  @ApiProperty({ enum: ["PROCEED", "HOLD"] })
  @IsIn(["PROCEED", "HOLD"])
  decision: "PROCEED" | "HOLD";

  @ApiProperty({ example: "Merchant verified recipient via WhatsApp" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: "Override reason is required" })
  @MinLength(3, { message: "Override reason is required" })
  @MaxLength(500)
  reason: string;
}

export const FEEDBACK_SIGNALS = [
  "ADDRESS_ACCEPTED",
  "ADDRESS_REJECTED",
  "ADDRESS_CORRECTED",
  "RISK_CORRECT",
  "RISK_INCORRECT",
  "RTO_CORRECT",
  "RTO_INCORRECT",
  "RECOMMENDATION_ACCEPTED",
  "RECOMMENDATION_IGNORED",
] as const;

export class IntelligenceFeedbackDto implements IntelligenceFeedbackInput {
  @ApiProperty({ enum: ["ADDRESS", "RISK", "RTO", "RECOMMENDATION"] })
  @IsIn(["ADDRESS", "RISK", "RTO", "RECOMMENDATION"])
  subjectType: "ADDRESS" | "RISK" | "RTO" | "RECOMMENDATION";

  @ApiProperty({ example: "sub-12345" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  subjectId: string;

  @ApiProperty({ enum: FEEDBACK_SIGNALS })
  @IsIn(FEEDBACK_SIGNALS)
  signal: (typeof FEEDBACK_SIGNALS)[number];

  @ApiPropertyOptional({ example: "Address confirmed accurate by customer service" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  detail?: string;
}
