import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from "class-validator";
import {
  type CreateWebhookSubscriptionDto as ICreateWebhookSubscriptionDto,
  type UpdateWebhookSubscriptionDto as IUpdateWebhookSubscriptionDto,
} from "@dhruto/contracts";

export class CreateWebhookSubscriptionDto implements ICreateWebhookSubscriptionDto {
  @ApiProperty({ example: "https://merchant.example.com/api/webhook" })
  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: "Must be a valid HTTP or HTTPS webhook URL" })
  url: string;

  @ApiProperty({ example: ["parcel.delivered", "parcel.created"], type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: "Select at least one webhook event" })
  @IsString({ each: true })
  events: string[];

  @ApiPropertyOptional({ example: "my-webhook-secret-key-12345" })
  @IsOptional()
  @IsString()
  @MinLength(16, { message: "Secret key must be at least 16 characters" })
  secret?: string;

  @ApiPropertyOptional({ example: "Production order synchronization" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateWebhookSubscriptionDto implements IUpdateWebhookSubscriptionDto {
  @ApiPropertyOptional({ example: "https://merchant.example.com/api/webhook" })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: "Must be a valid HTTP or HTTPS webhook URL" })
  url?: string;

  @ApiPropertyOptional({ example: ["parcel.delivered"], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];

  @ApiPropertyOptional({ enum: ["ACTIVE", "INACTIVE"] })
  @IsOptional()
  @IsIn(["ACTIVE", "INACTIVE"])
  status?: "ACTIVE" | "INACTIVE";

  @ApiPropertyOptional({ example: "Updated description" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
