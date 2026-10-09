import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { type Response } from "express";
import { ZodError } from "zod";
import { type RequestWithId } from "../middleware/request-id.middleware.js";
import { type ApiValidationErrorItem } from "@dhruto/contracts";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    const requestId = request.requestId || "unknown";
    const timestamp = new Date().toISOString();
    const path = request.originalUrl || request.url || "unknown";

    // 1. NestJS HttpException (including DhrutoValidationException)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message = exception.message;
      let errorCode = "HTTP_ERROR";
      let errors: ApiValidationErrorItem[] | undefined = undefined;

      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const respObj = exceptionResponse as Record<string, unknown>;
        if (typeof respObj["message"] === "string") {
          message = respObj["message"];
        } else if (Array.isArray(respObj["message"])) {
          message = respObj["message"].join(", ");
        }
        if (typeof respObj["error"] === "string") {
          errorCode = respObj["error"].toUpperCase().replace(/\s+/g, "_");
        } else if (typeof respObj["errorCode"] === "string") {
          errorCode = String(respObj["errorCode"]);
        }
        if (Array.isArray(respObj["errors"])) {
          errors = respObj["errors"] as ApiValidationErrorItem[];
        }
      }

      response.status(status).json({
        success: false,
        statusCode: status,
        message,
        errorCode,
        path,
        requestId,
        timestamp,
        ...(errors ? { errors } : {}),
      });
      return;
    }

    // 2. Direct ZodError fallback
    if (exception instanceof ZodError) {
      const validationErrors: ApiValidationErrorItem[] = exception.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      }));

      response.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
        success: false,
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: "Validation failed",
        errorCode: "VALIDATION_ERROR",
        path,
        requestId,
        timestamp,
        errors: validationErrors,
      });
      return;
    }

    // 4. Unexpected Internal Errors
    this.logger.error("Unhandled exception occurred", exception);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "An internal server error occurred",
      errorCode: "INTERNAL_SERVER_ERROR",
      path,
      requestId,
      timestamp,
    });
  }
}
