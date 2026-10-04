import { createZodDto } from "nestjs-zod";
import { parcelCreatedResponseSchema } from "@dhruto/contracts";

export class ParcelResponseDto extends createZodDto(parcelCreatedResponseSchema) {}
