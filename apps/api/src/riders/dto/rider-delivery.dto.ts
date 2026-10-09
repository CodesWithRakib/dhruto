import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import {
  DeliveryFailureReason,
  RiderDutyStatus,
  type CashHandInDto as ICashHandInDto,
  type CompleteDeliveryDto as ICompleteDeliveryDto,
  type FailDeliveryDto as IFailDeliveryDto,
  type RequestOtpDto as IRequestOtpDto,
  type SetDutyDto as ISetDutyDto,
  type VerifyOtpDto as IVerifyOtpDto,
} from "@dhruto/contracts";

export class VerifyOtpDto implements IVerifyOtpDto {
  @ApiProperty({ example: "123456", description: "6-digit numeric OTP" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "OTP must be a string" })
  @IsNotEmpty({ message: "OTP is required" })
  @Matches(/^\d{6}$/, { message: "OTP must be exactly 6 digits" })
  otp: string;
}

export class RequestOtpDto implements IRequestOtpDto {}

export class CompleteDeliveryDto implements ICompleteDeliveryDto {
  @ApiPropertyOptional({ example: "123456", description: "6-digit OTP provided by recipient" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "OTP must be a string" })
  @Matches(/^\d{6}$/, { message: "OTP must be exactly 6 digits" })
  otp?: string;

  @ApiPropertyOptional({ example: 1200, description: "Amount collected for cash on delivery" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "COD amount collected must be a number" })
  @Min(0, { message: "COD amount collected cannot be negative" })
  @Max(10000000, { message: "COD amount collected exceeds maximum allowable limit" })
  codAmountCollected?: number;

  @ApiPropertyOptional({ example: "Delivered to security guard", description: "Optional notes" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "Remarks must be a string" })
  @MaxLength(500, { message: "Remarks cannot exceed 500 characters" })
  remarks?: string;

  @ApiPropertyOptional({ example: "https://storage.dhruto.com/proofs/123.jpg" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsUrl({}, { message: "Proof photo URL must be a valid URL" })
  @MaxLength(2048, { message: "Proof photo URL cannot exceed 2048 characters" })
  proofPhotoUrl?: string;
}

export class FailDeliveryDto implements IFailDeliveryDto {
  @ApiProperty({ enum: DeliveryFailureReason })
  @IsEnum(DeliveryFailureReason, { message: "Invalid failure reason" })
  reason: DeliveryFailureReason;

  @ApiPropertyOptional({ example: "2026-10-10" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(64)
  rescheduledDate?: string;

  @ApiPropertyOptional({ example: "Recipient requested delivery tomorrow afternoon" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CashHandInDto implements ICashHandInDto {
  @ApiPropertyOptional({ example: "Handed over cash to hub manager Tanvir" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class SetDutyDto implements ISetDutyDto {
  @ApiProperty({ enum: RiderDutyStatus })
  @IsEnum(RiderDutyStatus, { message: "Invalid duty status" })
  duty: RiderDutyStatus;
}
