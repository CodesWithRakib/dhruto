import { createZodDto } from "nestjs-zod";
import { parcelBookingSchema } from "@dhruto/contracts";

export class CreateParcelDto extends createZodDto(parcelBookingSchema) {}
