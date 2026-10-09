import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import {
  NotificationCategory,
  NotificationChannel,
  NotificationType,
  PreferenceChannel,
  type CreateNotificationDto as ICreateNotificationDto,
  type UpdatePreferencesDto as IUpdatePreferencesDto,
} from "@dhruto/contracts";

export class CreateNotificationDto implements ICreateNotificationDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID("4")
  merchantId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID("4")
  userId?: string;

  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ example: "Parcel Delivered" })
  @IsString({ message: "Title must be a string" })
  @IsNotEmpty({ message: "Title is required" })
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: "Your parcel DHR-20261008-ABC123 has been delivered." })
  @IsString({ message: "Message must be a string" })
  @IsNotEmpty({ message: "Message is required" })
  message: string;

  @ApiPropertyOptional({ example: "01712345678" })
  @IsOptional()
  @IsString()
  recipientTarget?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class NotificationPreferenceInputDto {
  @ApiProperty({ enum: NotificationCategory })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiProperty({ enum: PreferenceChannel })
  @IsEnum(PreferenceChannel)
  channel: PreferenceChannel;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;
}

export class UpdatePreferencesDto implements IUpdatePreferencesDto {
  @ApiProperty({ type: [NotificationPreferenceInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceInputDto)
  preferences: NotificationPreferenceInputDto[];

  @ApiPropertyOptional({ enum: ["en", "bn"] })
  @IsOptional()
  @IsIn(["en", "bn"])
  locale?: "en" | "bn";
}

export class TestSmsDto {
  @ApiProperty({ example: "01712345678" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: "Test notification message" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(320)
  message: string;
}
