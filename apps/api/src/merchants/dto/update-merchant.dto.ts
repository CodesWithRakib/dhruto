import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { Transform } from "class-transformer";
import { BANGLADESH_PHONE_REGEX } from "@dhruto/contracts";

export class UpdateMerchantDto {
  @ApiPropertyOptional({ example: "Dhaka Traders" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  businessName?: string;

  @ApiPropertyOptional({ example: "01712345678" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Matches(BANGLADESH_PHONE_REGEX, { message: "Invalid Bangladesh mobile number" })
  contactPhone?: string;

  @ApiPropertyOptional({ example: "House 1, Road 2, Gulshan, Dhaka" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  pickupAddress?: string;
}
