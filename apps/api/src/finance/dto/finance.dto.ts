import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
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
  PayoutMethod,
  PayoutStatus,
  type ApprovePayoutDto as IApprovePayoutDto,
  type CreateAdjustmentDto as ICreateAdjustmentDto,
  type CreateSettlementBatchDto as ICreateSettlementBatchDto,
  type ProcessPayoutDto as IProcessPayoutDto,
  type RequestPayoutDto as IRequestPayoutDto,
  type ResolveDiscrepancyDto as IResolveDiscrepancyDto,
  type ReverseTransactionDto as IReverseTransactionDto,
  type VerifyCashLedgerDto as IVerifyCashLedgerDto,
} from "@dhruto/contracts";

export class PayoutAccountDetailsDto {
  @ApiProperty({ example: "01712345678" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: "Account or mobile number required" })
  @MinLength(8, { message: "Account or mobile number required" })
  accountNumber: string;

  @ApiPropertyOptional({ enum: ["PERSONAL", "MERCHANT"], default: "PERSONAL" })
  @IsOptional()
  @IsIn(["PERSONAL", "MERCHANT"])
  accountType: "PERSONAL" | "MERCHANT" = "PERSONAL";

  @ApiPropertyOptional({ example: "Dutch-Bangla Bank" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: "Dhanmondi Branch" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  branchName?: string;

  @ApiPropertyOptional({ example: "Tanvir Ahmed" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  accountHolderName?: string;
}

export class RequestPayoutDto implements IRequestPayoutDto {
  @ApiProperty({ example: 5000, description: "Payout withdrawal amount in BDT (min ৳100)" })
  @Type(() => Number)
  @IsNumber({}, { message: "Amount must be a number" })
  @IsPositive({ message: "Withdrawal amount must be greater than 0" })
  @Min(100, { message: "Minimum payout request amount is ৳100" })
  amount: number;

  @ApiProperty({ enum: PayoutMethod })
  @IsEnum(PayoutMethod, { message: "Invalid payout method" })
  payoutMethod: PayoutMethod;

  @ApiProperty({ type: PayoutAccountDetailsDto })
  @ValidateNested()
  @Type(() => PayoutAccountDetailsDto)
  accountDetails: PayoutAccountDetailsDto;

  @ApiPropertyOptional({ example: "Weekly withdrawal" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  notes?: string;
}

export class VerifyCashLedgerDto implements IVerifyCashLedgerDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID("4", { message: "Invalid cash ledger ID" })
  @IsNotEmpty({ message: "Invalid cash ledger ID" })
  cashLedgerId: string;

  @ApiPropertyOptional({ example: 4500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  actualAmount?: number;

  @ApiPropertyOptional({ example: "Verified full cash deposit" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  notes?: string;
}

export class ProcessPayoutDto implements IProcessPayoutDto {
  @ApiProperty({ enum: [PayoutStatus.COMPLETED, PayoutStatus.FAILED, PayoutStatus.REJECTED] })
  @IsIn([PayoutStatus.COMPLETED, PayoutStatus.FAILED, PayoutStatus.REJECTED])
  status: PayoutStatus.COMPLETED | PayoutStatus.FAILED | PayoutStatus.REJECTED;

  @ApiPropertyOptional({ example: "TXN-BKASH-987654" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  transactionReference?: string;

  @ApiPropertyOptional({ example: "Incorrect account name" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;

  @ApiPropertyOptional({ example: "Gateway timeout" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  failureReason?: string;
}

export class ApprovePayoutDto implements IApprovePayoutDto {
  @ApiPropertyOptional({ example: "Approved by finance manager" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateAdjustmentDto implements ICreateAdjustmentDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID("4", { message: "Invalid merchant ID" })
  @IsNotEmpty({ message: "Invalid merchant ID" })
  merchantId: string;

  @ApiProperty({ enum: ["CREDIT", "DEBIT"] })
  @IsIn(["CREDIT", "DEBIT"])
  direction: "CREDIT" | "DEBIT";

  @ApiProperty({ example: 500, description: "Adjustment amount in BDT" })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Max(100_000_000)
  amount: number;

  @ApiProperty({ example: "Compensation for damaged parcel during transit" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({ example: "PARCEL" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(50)
  referenceType?: string;

  @ApiPropertyOptional({ example: "DHR-20261008-ABC123" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  referenceId?: string;
}

export class ReverseTransactionDto implements IReverseTransactionDto {
  @ApiProperty({ example: "Correction for duplicate charge" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

export class CreateSettlementBatchDto implements ICreateSettlementBatchDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID("4", { message: "Invalid merchant ID" })
  @IsNotEmpty({ message: "Invalid merchant ID" })
  merchantId: string;

  @ApiProperty({ example: ["s0000000-0000-0000-0000-000000000001"], type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID("4", { each: true })
  settlementIds: string[];

  @ApiPropertyOptional({ example: "Daily automated settlement batch" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ResolveDiscrepancyDto implements IResolveDiscrepancyDto {
  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100_000_000)
  recoveredAmount: number = 0;

  @ApiProperty({ example: "Shortage reconciled after cash drawer recount" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}
