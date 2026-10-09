import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { UserRole } from "../../database/entities/index.js";
import { BANGLADESH_PHONE_REGEX } from "@dhruto/contracts";

export class RegisterDto {
  @ApiProperty({ example: "Tanvir Ahmed" })
  @IsString({ message: "Name must be a string" })
  @IsNotEmpty({ message: "Name is required" })
  @MinLength(2, { message: "Name must be at least 2 characters" })
  @MaxLength(100, { message: "Name cannot exceed 100 characters" })
  name: string;

  @ApiProperty({ example: "tanvir@dhruto.com" })
  @IsString({ message: "Email must be a string" })
  @IsNotEmpty({ message: "Email is required" })
  @IsEmail({}, { message: "Invalid email address" })
  email: string;

  @ApiProperty({ example: "01712345678" })
  @IsString({ message: "Phone must be a string" })
  @IsNotEmpty({ message: "Phone is required" })
  @Matches(BANGLADESH_PHONE_REGEX, {
    message: "Invalid 11-digit BD phone number (e.g. 017XXXXXXXX)",
  })
  phone: string;

  @ApiProperty({ example: "secret123", minLength: 6 })
  @IsString({ message: "Password must be a string" })
  @IsNotEmpty({ message: "Password is required" })
  @MinLength(6, { message: "Password must be at least 6 characters" })
  password: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.MERCHANT })
  @IsOptional()
  @IsEnum(UserRole, { message: "Invalid user role" })
  role?: UserRole = UserRole.MERCHANT;

  @ApiPropertyOptional({ example: "Tanvir Fashion House" })
  @IsOptional()
  @IsString({ message: "Business name must be a string" })
  businessName?: string;

  @ApiPropertyOptional({ example: "House 12, Road 4, Dhanmondi, Dhaka" })
  @IsOptional()
  @IsString({ message: "Pickup address must be a string" })
  pickupAddress?: string;

  @ApiPropertyOptional({ example: "a0000000-0000-0000-0000-000000000001" })
  @IsOptional()
  @IsUUID("4", { message: "Invalid hub ID format" })
  hubId?: string;
}

export class LoginDto {
  @ApiProperty({ example: "tanvir@dhruto.com", description: "Email or Bangladesh mobile number" })
  @IsString({ message: "Email or phone must be a string" })
  @IsNotEmpty({ message: "Email or phone number is required" })
  @MinLength(3, { message: "Email or phone number is required" })
  emailOrPhone: string;

  @ApiProperty({ example: "secret123" })
  @IsString({ message: "Password must be a string" })
  @IsNotEmpty({ message: "Password is required" })
  @MinLength(1, { message: "Password is required" })
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: "Refresh token provided at login" })
  @IsString({ message: "Refresh token must be a string" })
  @IsNotEmpty({ message: "Valid refresh token required" })
  @MinLength(10, { message: "Valid refresh token required" })
  refreshToken: string;
}
