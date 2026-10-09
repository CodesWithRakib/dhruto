import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ParcelStatus, type ParcelCreatedResponse } from "@dhruto/contracts";

export class ParcelResponseDto implements ParcelCreatedResponse {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty({ example: "DHR-20261008-ABC123" })
  trackingCode: string;

  @ApiProperty({ example: "Rahim Uddin" })
  recipientName: string;

  @ApiProperty({ example: "01712345678" })
  recipientPhone: string;

  @ApiProperty({ example: "Dhaka" })
  district: string;

  @ApiProperty({ example: "Dhanmondi" })
  thana: string;

  @ApiProperty({ example: "House 12, Road 4, Dhanmondi, Dhaka" })
  deliveryAddress: string;

  @ApiPropertyOptional({ nullable: true })
  parcelDescription: string | null;

  @ApiProperty({ example: 1200 })
  codAmount: number;

  @ApiProperty({ example: 1.5 })
  weight: number;

  @ApiProperty({ example: 60 })
  deliveryFee: number;

  @ApiProperty({ enum: ParcelStatus })
  status: ParcelStatus;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
