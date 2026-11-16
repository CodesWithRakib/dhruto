import { type PipeTransform } from "@nestjs/common";
import { type ZodType } from "zod";
import { type ApiValidationErrorItem } from "@dhruto/contracts";
import { DhrutoValidationException } from "../../common/pipes/validation.pipe.js";

/**
 * Validates a request body or query against a shared `@dhruto/contracts` zod
 * schema and emits the platform's standard 422 VALIDATION_ERROR shape.
 *
 * Chat request contracts already exist as strict zod schemas, so reusing them
 * avoids a second, drifting class-validator definition. Parameters typed with
 * the schemas' inferred TS types reach this pipe untouched, because the global
 * DhrutoValidationPipe skips non-class metatypes.
 */
export class ZodValidationPipe<TOutput> implements PipeTransform<unknown, TOutput> {
  constructor(private readonly schema: ZodType<TOutput, unknown>) {}

  transform(value: unknown): TOutput {
    const result = this.schema.safeParse(value ?? {});
    if (result.success) return result.data;
    const errors: ApiValidationErrorItem[] = result.error.issues.map((issue) => ({
      field: issue.path.length > 0 ? issue.path.join(".") : "request",
      message: issue.message,
      code: issue.code,
    }));
    throw new DhrutoValidationException(errors);
  }
}
