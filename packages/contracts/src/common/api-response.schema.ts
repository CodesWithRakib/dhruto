import { z } from "zod";

export const paginationMetaSchema = z.object({
  // Offset pagination
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  total: z.number().int().nonnegative().optional(),
  totalPages: z.number().int().nonnegative().optional(),
  hasNextPage: z.boolean().optional(),
  hasPreviousPage: z.boolean().optional(),

  // Cursor pagination
  nextCursor: z.string().nullable().optional(),
  prevCursor: z.string().nullable().optional(),
  hasMore: z.boolean().optional(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

// Meta is primarily reserved for pagination info (cursor or offset)
// requestId, timestamp, path are also optionally permitted during compilation before interceptor elevates them
export const apiResponseMetaSchema = paginationMetaSchema.extend({
  requestId: z.string().optional(),
  timestamp: z.string().optional(),
  path: z.string().optional(),
});

export type ApiResponseMeta = z.infer<typeof apiResponseMetaSchema>;

export const apiSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    statusCode: z.number(),
    message: z.string(),
    data: dataSchema,
    path: z.string().optional(),
    requestId: z.string().optional(),
    timestamp: z.string().optional(),
    meta: apiResponseMetaSchema.optional(),
  });

export const apiValidationErrorItemSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string().optional(),
});

export type ApiValidationErrorItem = z.infer<typeof apiValidationErrorItemSchema>;

export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  statusCode: z.number(),
  message: z.string(),
  errorCode: z.string(),
  path: z.string().optional(),
  requestId: z.string().optional(),
  timestamp: z.string().optional(),
  errors: z.array(apiValidationErrorItemSchema).optional(),
  meta: apiResponseMetaSchema.optional(),
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  errorCode?: string;
  path?: string;
  requestId?: string;
  timestamp?: string;
  errors?: ApiValidationErrorItem[];
  meta?: ApiResponseMeta;
}
