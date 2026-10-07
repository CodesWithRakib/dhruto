import { createZodDto } from "nestjs-zod";
import {
  createNotificationSchema,
  updatePreferencesSchema,
} from "@dhruto/contracts";
import { z } from "zod";

export class CreateNotificationDto extends createZodDto(createNotificationSchema) {}
export class UpdatePreferencesDto extends createZodDto(updatePreferencesSchema) {}

export const testSmsSchema = z.object({
  phone: z.string().trim().min(8).max(20),
  message: z.string().trim().min(1).max(320),
});

export class TestSmsDto extends createZodDto(testSmsSchema) {}
