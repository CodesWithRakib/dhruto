import { z } from "zod";

export const apiResponseMetaSchema = z.object({
  requestId: z.string(),
  timestamp: z.string(),
});

export type ApiResponseMeta = z.infer<typeof apiResponseMetaSchema>;

export const apiSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    statusCode: z.number(),
    message: z.string(),
    data: dataSchema,
    meta: apiResponseMetaSchema,
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
  errors: z.array(apiValidationErrorItemSchema).optional(),
  meta: apiResponseMetaSchema,
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  errorCode?: string;
  errors?: ApiValidationErrorItem[];
  meta: ApiResponseMeta;
}
