import {
  ValidationPipe as NestValidationPipe,
  ValidationError,
  HttpStatus,
  HttpException,
  Injectable,
} from "@nestjs/common";
import { type ApiValidationErrorItem } from "@dhruto/contracts";

export class DhrutoValidationException extends HttpException {
  readonly errors: ApiValidationErrorItem[];

  constructor(errors: ApiValidationErrorItem[]) {
    super(
      {
        success: false,
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: "Validation failed",
        errorCode: "VALIDATION_ERROR",
        errors,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
    this.errors = errors;
  }
}

function formatValidationErrors(
  errors: ValidationError[],
  parent = "",
): ApiValidationErrorItem[] {
  const items: ApiValidationErrorItem[] = [];

  for (const err of errors) {
    const field = parent ? `${parent}.${err.property}` : err.property;

    if (err.constraints) {
      for (const [code, message] of Object.entries(err.constraints)) {
        items.push({ field, message, code });
      }
    }

    if (err.children && err.children.length > 0) {
      items.push(...formatValidationErrors(err.children, field));
    }
  }

  return items;
}

@Injectable()
export class DhrutoValidationPipe extends NestValidationPipe {
  constructor() {
    super({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: false,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      exceptionFactory: (validationErrors: ValidationError[]) => {
        const formatted = formatValidationErrors(validationErrors);
        return new DhrutoValidationException(formatted);
      },
    });
  }
}
