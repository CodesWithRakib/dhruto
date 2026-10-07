import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { analyticsQuerySchema, exportRequestSchema } from "@dhruto/contracts";

export class AnalyticsQueryDto extends createZodDto(analyticsQuerySchema) {}

const rangeQuerySchema = z.object({
  preset: z
    .enum(["today", "yesterday", "7d", "30d", "month", "last-month", "90d", "custom"])
    .optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  timezone: z.string().max(64).optional(),
  hubId: z.string().uuid().optional(),
  riderId: z.string().uuid().optional(),
  merchantId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export class AnalyticsRangeQueryDto extends createZodDto(rangeQuerySchema) {}

export class ExportRequestDto extends createZodDto(exportRequestSchema) {}
