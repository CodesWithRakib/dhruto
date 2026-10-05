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
            meta: {
              requestId,
              timestamp,
              path,
            },
          };
        }

        // If data is already an envelope with success property
        if ("success" in data) {
          const resObj = { ...data } as Record<string, any>;

          // Ensure path is present at root
          if (!resObj.path) {
            resObj.path = path;
          }

          // Ensure meta is present and includes path & requestId
          if (!resObj.meta) {
            resObj.meta = {
              requestId,
              timestamp,
              path,
            };
          } else {
            resObj.meta = {
              requestId: resObj.meta.requestId || requestId,
              timestamp: resObj.meta.timestamp || timestamp,
              path: resObj.meta.path || path,
              ...resObj.meta,
            };
          }

          // If pagination is provided at root, lift it into meta.pagination
          if (resObj.pagination && !resObj.meta.pagination) {
            resObj.meta.pagination = resObj.pagination;
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
          meta: {
            requestId,
            timestamp,
            path,
          },
        };
      }),
    );
  }
}
