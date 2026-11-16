import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
  Logger,
} from "@nestjs/common";
import { type Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { type RequestWithId } from "../middleware/request-id.middleware.js";
import { redactUrl } from "./redact-url.js";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<RequestWithId>();
    const response = ctx.getResponse();

    const startTime = Date.now();
    const { method, ip } = request;
    // Sensitive query values (staff reasons, search text, tokens) are redacted.
    const originalUrl = redactUrl(request.originalUrl);
    const requestId = request.requestId || "unknown";

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.logger.log(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              level: "info",
              service: "api",
              requestId,
              method,
              route: originalUrl,
              statusCode,
              durationMs,
              clientIp: ip,
            }),
          );
        },
        error: (err) => {
          const durationMs = Date.now() - startTime;
          const statusCode = err?.status || response.statusCode || 500;

          this.logger.error(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              level: "error",
              service: "api",
              requestId,
              method,
              route: originalUrl,
              statusCode,
              durationMs,
              clientIp: ip,
              errorMessage: err?.message,
            }),
          );
        },
      }),
    );
  }
}
