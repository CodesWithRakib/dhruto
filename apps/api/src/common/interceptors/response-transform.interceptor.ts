import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from "@nestjs/common";
import { type Observable } from "rxjs";
import { map } from "rxjs/operators";
import { type RequestWithId } from "../middleware/request-id.middleware.js";

/**
 * Operational probes (`/health`, `/system`) must return a flat payload — the
 * Kubernetes/container runtime inspects `status` at the top level and must not
 * have to unwrap an application envelope.
 */
const PROBE_PATH_PATTERN = /^\/(?:api\/v\d+\/)?(?:health|system)(?:\/|$|\?)/;

const PAGINATION_KEYS = ["page", "limit", "total", "nextCursor", "hasMore"];

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithId & { user?: unknown }>();
    const path = request?.originalUrl || request?.url || "unknown";
    const requestId = request?.requestId || "unknown";
    const timestamp = new Date().toISOString();

    return next.handle().pipe(
      map((data: unknown) => {
        if (PROBE_PATH_PATTERN.test(path)) {
          return data;
        }

        // Primitives and null are wrapped directly.
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

        const envelope = data as Record<string, unknown>;

        // Already an explicit envelope (controllers return these when they need
        // pagination metadata or a custom message).
        if ("success" in envelope) {
          const result: Record<string, unknown> = { ...envelope };
          result.path = result.path || path;
          result.requestId =
            result.requestId ||
            readMetaString(envelope, "requestId") ||
            requestId;
          result.timestamp =
            result.timestamp ||
            readMetaString(envelope, "timestamp") ||
            timestamp;

          const pagination = extractPagination(envelope);
          if (pagination) {
            result.meta = pagination;
          } else {
            delete result.meta;
          }

          return result;
        }

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

function readMetaString(
  envelope: Record<string, unknown>,
  key: string,
): string | undefined {
  const meta = envelope.meta;
  if (meta && typeof meta === "object") {
    const value = (meta as Record<string, unknown>)[key];
    if (typeof value === "string") {
      return value;
    }
  }
  return undefined;
}

/**
 * Returns the pagination metadata for a list response, or `undefined`.
 * Prefers an explicit `meta.pagination`; otherwise treats `meta` as pagination
 * when it carries one of the documented pagination keys.
 */
function extractPagination(
  envelope: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const meta = envelope.meta;
  if (!meta || typeof meta !== "object") {
    return undefined;
  }

  const metaRecord = meta as Record<string, unknown>;
  const nested = metaRecord.pagination;
  const source =
    nested && typeof nested === "object"
      ? (nested as Record<string, unknown>)
      : PAGINATION_KEYS.some((key) => metaRecord[key] !== undefined)
        ? metaRecord
        : undefined;

  if (!source) {
    return undefined;
  }

  const { requestId, timestamp, path, pagination, ...rest } = source;
  void requestId;
  void timestamp;
  void path;
  void pagination;
  return rest;
}
