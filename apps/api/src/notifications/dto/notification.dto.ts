import { createZodDto } from "nestjs-zod";
import { createNotificationSchema } from "@dhruto/contracts";

export class CreateNotificationDto extends createZodDto(createNotificationSchema) {}
