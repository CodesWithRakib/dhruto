import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { UserRole } from "../../database/entities/index.js";
import { BANGLADESH_PHONE_REGEX } from "@dhruto/contracts";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .regex(BANGLADESH_PHONE_REGEX, "Invalid 11-digit BD phone number (e.g. 017XXXXXXXX)"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.nativeEnum(UserRole).default(UserRole.MERCHANT),
  businessName: z.string().optional(),
  pickupAddress: z.string().optional(),
  hubId: z.string().uuid().optional(),
});

export class RegisterDto extends createZodDto(registerSchema) {
  @ApiProperty({ example: "Tanvir Ahmed" })
  name: string;

  @ApiProperty({ example: "tanvir@dhruto.com" })
  email: string;

  @ApiProperty({ example: "01712345678" })
  phone: string;

  @ApiProperty({ example: "secret123", minLength: 6 })
  password: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.MERCHANT })
  role: UserRole;

  @ApiPropertyOptional({ example: "Tanvir Fashion House" })
  businessName?: string;

  @ApiPropertyOptional({ example: "House 12, Road 4, Dhanmondi, Dhaka" })
  pickupAddress?: string;

  @ApiPropertyOptional({ example: "a0000000-0000-0000-0000-000000000001" })
  hubId?: string;
}

export const loginSchema = z.object({
  emailOrPhone: z.string().min(3, "Email or phone number is required"),
  password: z.string().min(1, "Password is required"),
});

export class LoginDto extends createZodDto(loginSchema) {
  @ApiProperty({ example: "tanvir@dhruto.com", description: "Email or Bangladesh mobile number" })
  emailOrPhone: string;

  @ApiProperty({ example: "secret123" })
  password: string;
}

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10, "Valid refresh token required"),
});

export class RefreshTokenDto extends createZodDto(refreshTokenSchema) {
  @ApiProperty({ description: "Refresh token provided at login" })
  refreshToken: string;
}
