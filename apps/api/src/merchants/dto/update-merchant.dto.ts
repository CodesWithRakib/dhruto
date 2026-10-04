import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { BANGLADESH_PHONE_REGEX } from "@dhruto/contracts";

export const updateMerchantSchema = z.object({
  businessName: z.string().min(2).max(255).optional(),
  contactPhone: z.string().regex(BANGLADESH_PHONE_REGEX, "Invalid Bangladesh mobile number").optional(),
  pickupAddress: z.string().min(5).max(500).optional(),
});

export class UpdateMerchantDto extends createZodDto(updateMerchantSchema) {}
