import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from "class-validator";
import {
  WebhookEvent,
  type CreateWebhookSubscriptionDto as ICreateWebhookSubscriptionDto,
  type UpdateWebhookSubscriptionDto as IUpdateWebhookSubscriptionDto,
} from "@dhruto/contracts";

export class CreateWebhookSubscriptionDto implements ICreateWebhookSubscriptionDto {
  @ApiProperty({ example: "https://merchant.example.com/api/webhook" })
  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: "Must be a valid HTTP or HTTPS webhook URL" })
  url: string;

  @ApiProperty({
    example: [WebhookEvent.PARCEL_DELIVERED, WebhookEvent.PARCEL_CREATED],
    enum: WebhookEvent,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1, { message: "Select at least one webhook event" })
  @IsEnum(WebhookEvent, { each: true, message: "Each event must be a valid WebhookEvent enum value" })
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

  @ApiPropertyOptional({ enum: WebhookEvent, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(WebhookEvent, { each: true, message: "Each event must be a valid WebhookEvent enum value" })
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
