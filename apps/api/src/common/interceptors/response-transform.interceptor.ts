import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from "@nestjs/common";
import { type Observable } from "rxjs";
import { map } from "rxjs/operators";
import { type RequestWithId } from "../middleware/request-id.middleware.js";

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<RequestWithId>();
    const path = request?.originalUrl || request?.url || "unknown";
    const requestId = request?.requestId || "unknown";
    const timestamp = new Date().toISOString();

    return next.handle().pipe(
      map((data) => {
        // If data is null or undefined, or not an object, wrap it
        if (!data || typeof data !== "object") {
          return {
            success: true,
            statusCode: 200,
            message: "Success",
            data,
            path,
            requestId,
            timestamp,
          };
        }

        // If data is already an envelope with success property
        if ("success" in data) {
          const resObj = { ...data } as Record<string, any>;

          // Move path, requestId, timestamp directly to root
          resObj.path = resObj.path || path;
          resObj.requestId = resObj.requestId || resObj.meta?.requestId || requestId;
          resObj.timestamp = resObj.timestamp || resObj.meta?.timestamp || timestamp;

          // Pagination handling in meta
          const pagination =
            resObj.meta?.pagination ||
            resObj.pagination ||
            (resObj.meta && (resObj.meta.page !== undefined || resObj.meta.total !== undefined || resObj.meta.nextCursor !== undefined)
              ? resObj.meta
              : undefined);

          delete resObj.pagination;

          if (pagination) {
            // Clean any requestId/timestamp/path from pagination meta if present
            const { requestId: _r, timestamp: _t, path: _p, ...cleanPagination } = pagination;
            resObj.meta = cleanPagination;
          } else {
            // No pagination metadata, remove or leave meta empty/undefined
            delete resObj.meta;
          }

          return resObj;
        }

        // Standard unwrapped payload
        return {
          success: true,
          statusCode: 200,
          message: "Success",
          data,
          path,
          requestId,
          timestamp,
        };
      }),
    );
  }
}
