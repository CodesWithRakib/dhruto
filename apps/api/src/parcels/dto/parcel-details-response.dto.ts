import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ParcelStatus,
  type ParcelAddressIntelligence,
  type ParcelDetailsResponse,
  type ParcelHistoryEntry,
  type PublicTrackingResponse,
  type TimelineEvent,
} from "@dhruto/contracts";
import { ParcelResponseDto } from "./parcel-response.dto.js";

export class ParcelHistoryResponseDto implements ParcelHistoryEntry {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiPropertyOptional({ enum: ParcelStatus, nullable: true })
  fromStatus: ParcelStatus | null;

  @ApiProperty({ enum: ParcelStatus })
  toStatus: ParcelStatus;

  @ApiProperty()
  eventType: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiProperty()
  actorRole: string;

  @ApiProperty()
  createdAt: string;
}

export class TimelineEventDto implements TimelineEvent {
  @ApiProperty({ enum: ParcelStatus })
  status: ParcelStatus;

  @ApiProperty()
  labelEn: string;

  @ApiProperty()
  labelBn: string;

  @ApiProperty()
  timestamp: string;

  @ApiPropertyOptional()
  note?: string;
}

export class PublicTrackingResponseDto implements PublicTrackingResponse {
  @ApiProperty({ example: "DHR-20261008-ABC123" })
  trackingCode: string;

  @ApiProperty({ enum: ParcelStatus })
  status: ParcelStatus;

  @ApiProperty({ example: "Dhaka" })
  recipientDistrict: string;

  @ApiProperty({ example: "Dhanmondi" })
  recipientThana: string;

  @ApiProperty({ example: "017******78" })
  recipientPhoneMasked: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional({ nullable: true })
  currentHubName: string | null;

  @ApiProperty({ type: [TimelineEventDto] })
  timeline: TimelineEventDto[];
}

export class ParcelAddressIntelligenceDto implements ParcelAddressIntelligence {
  @ApiProperty()
  district: string;

  @ApiProperty()
  thana: string;

  @ApiPropertyOptional({ nullable: true })
  zone: string | null;

  @ApiPropertyOptional({ nullable: true })
  confidenceScore: number | null;

  @ApiPropertyOptional({ nullable: true })
  confidenceTier: string | null;

  @ApiPropertyOptional({ nullable: true })
  riskScore: number | null;

  @ApiPropertyOptional({ nullable: true })
  riskTier: string | null;

  @ApiPropertyOptional({ nullable: true })
  rtoProbability: number | null;
}

export class ParcelDetailsResponseDto extends ParcelResponseDto implements ParcelDetailsResponse {
  @ApiProperty({ format: "uuid" })
  merchantId: string;

  @ApiProperty()
  merchantName: string;

  @ApiProperty()
  pickupAddress: string;

  @ApiPropertyOptional({ nullable: true })
  currentRiderName: string | null;

  @ApiPropertyOptional({ nullable: true })
  currentHubName: string | null;

  @ApiProperty({ type: ParcelAddressIntelligenceDto })
  addressIntelligence: ParcelAddressIntelligenceDto;

  @ApiProperty({ type: [ParcelHistoryResponseDto] })
  history: ParcelHistoryResponseDto[];
}
