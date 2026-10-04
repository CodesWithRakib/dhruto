import { createZodDto } from "nestjs-zod";
import {
  createWebhookSubscriptionSchema,
  updateWebhookSubscriptionSchema,
} from "@dhruto/contracts";

export class CreateWebhookSubscriptionDto extends createZodDto(createWebhookSubscriptionSchema) {}
export class UpdateWebhookSubscriptionDto extends createZodDto(updateWebhookSubscriptionSchema) {}
