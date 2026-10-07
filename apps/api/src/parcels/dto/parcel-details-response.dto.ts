import { createZodDto } from "nestjs-zod";
import {
  parcelDetailsResponseSchema,
  parcelHistoryEntrySchema,
  publicTrackingResponseSchema,
} from "@dhruto/contracts";

export class ParcelDetailsResponseDto extends createZodDto(parcelDetailsResponseSchema) {}

export class ParcelHistoryResponseDto extends createZodDto(parcelHistoryEntrySchema) {}

export class PublicTrackingResponseDto extends createZodDto(publicTrackingResponseSchema) {}
