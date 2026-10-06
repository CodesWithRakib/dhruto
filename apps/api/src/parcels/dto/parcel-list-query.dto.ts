import { createZodDto } from "nestjs-zod";
import { parcelListQuerySchema } from "@dhruto/contracts";

export class ParcelListQueryDto extends createZodDto(parcelListQuerySchema) {}
