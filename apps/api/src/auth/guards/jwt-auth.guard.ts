import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { CustomJwtService } from "../jwt/custom-jwt.service.js";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";
import { AuthenticatedUser } from "../jwt/jwt.interface.js";
import { getErrorMessage } from "../../common/utils/error.util.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: CustomJwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException("Authorization header is missing");
    }

    const trimmedHeader = authHeader.trim();
    if (!trimmedHeader.toLowerCase().startsWith("bearer ")) {
      throw new UnauthorizedException("Invalid authorization header format (must be Bearer <token>)");
    }

    // Extract token cleanly, removing any accidental quotes or whitespace
    let token = trimmedHeader.slice(7).trim();
    if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'"))
    ) {
      token = token.slice(1, -1).trim();
    }

    if (!token) {
      throw new UnauthorizedException("Authorization token is missing or empty");
    }

    try {
      const payload = this.jwtService.verifyAccessToken(token);
      const user: AuthenticatedUser = {
        id: payload.sub,
        email: payload.email,
        phone: payload.phone,
        role: payload.role,
        merchantId: payload.merchantId,
        riderId: payload.riderId,
        hubId: payload.hubId,
      };

      request.user = user;
      return true;
    } catch (err) {
      throw new UnauthorizedException(
        getErrorMessage(err, "Invalid or expired authorization token"),
      );
    }
  }
}
