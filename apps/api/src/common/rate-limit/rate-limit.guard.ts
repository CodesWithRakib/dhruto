import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ApiErrorCode } from "@dhruto/contracts";
import { CacheService } from "../cache/cache.service.js";
import { RATE_LIMIT_KEY, type RateLimitOptions } from "./rate-limit.decorator.js";
import { type AuthenticatedUser } from "../../auth/jwt/jwt.interface.js";

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

interface RateLimitedRequest {
  user?: AuthenticatedUser;
  ip?: string;
  socket?: { remoteAddress?: string };
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Fixed-window rate limiter.
 *
 * Counters are stored in the shared cache so the limit holds across instances.
 * A best-effort limiter is appropriate here: it protects public tracking and
 * command endpoints from abuse without adding infrastructure.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RateLimitedRequest>();
    const identity = this.resolveIdentity(request);
    const key = `rl:${options.scope}:${identity}`;
    const now = Date.now();

    const existing = await this.cacheService.get<RateLimitWindow>(key);

    if (!existing || existing.resetAt <= now) {
      await this.cacheService.set(
        key,
        { count: 1, resetAt: now + options.windowSeconds * 1000 },
        options.windowSeconds,
      );
      return true;
    }

    if (existing.count >= options.limit) {
      const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      context
        .switchToHttp()
        .getResponse<{ setHeader(name: string, value: string): void }>()
        .setHeader("Retry-After", String(retryAfter));
      throw new HttpException(
        {
          message:
            "Too many requests. Please slow down and try again shortly.",
          error: ApiErrorCode.RATE_LIMIT_EXCEEDED,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    existing.count += 1;
    await this.cacheService.set(
      key,
      existing,
      Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    );
    return true;
  }

  private resolveIdentity(request: RateLimitedRequest): string {
    if (request.user?.id) {
      return `user:${request.user.id}`;
    }
    const forwarded = request.headers["x-forwarded-for"];
    const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const ip =
      forwardedValue?.split(",")[0]?.trim() ||
      request.ip ||
      request.socket?.remoteAddress ||
      "unknown";
    return `ip:${ip}`;
  }
}
