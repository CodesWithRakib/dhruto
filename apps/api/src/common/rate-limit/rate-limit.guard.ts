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
 * Fixed-window rate limiter (T-SEC-02).
 *
 * The shared atomic counter (`CacheService.incr`) is authoritative whenever
 * Redis is reachable, so the limit holds across instances. When Redis is
 * unavailable the per-instance memory window enforces the limit instead:
 * precision degrades, but abuse protection is never silently disabled.
 * No account lockout is performed — only the request is throttled (429).
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
  ) {}

  private static readonly inFlight = new Map<string, RateLimitWindow>();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RateLimitedRequest>();
    const identity = this.resolveIdentity(request);
    const key = `rl:${options.scope}:${identity}`;
    const now = Date.now();

    // Shared atomic counter first (multi-instance correct when Redis is up).
    const shared = await this.cacheService.incr(key, options.windowSeconds).catch(() => null);
    if (shared) {
      // Mirror into memory so a later Redis outage continues from a warm window.
      RateLimitGuard.inFlight.set(key, {
        count: shared.count,
        resetAt: now + shared.ttlSeconds * 1000,
      });
      if (shared.count > options.limit) {
        this.reject(context, Math.max(1, shared.ttlSeconds));
      }
      return true;
    }

    // Redis unavailable: authoritative per-instance memory window.
    let existing = RateLimitGuard.inFlight.get(key);
    if (!existing || existing.resetAt <= now) {
      existing = { count: 0, resetAt: now + options.windowSeconds * 1000 };
      RateLimitGuard.inFlight.set(key, existing);
    }

    existing.count += 1;
    if (existing.count > options.limit) {
      this.reject(context, Math.max(1, Math.ceil((existing.resetAt - now) / 1000)));
    }
    return true;
  }

  private reject(
    context: ExecutionContext,
    retryAfter: number,
  ): never {
    context
      .switchToHttp()
      .getResponse<{ setHeader(name: string, value: string): void }>()
      .setHeader("Retry-After", String(retryAfter));
    throw new HttpException(
      {
        message: "Too many requests. Please slow down and try again shortly.",
        error: ApiErrorCode.RATE_LIMIT_EXCEEDED,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
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
