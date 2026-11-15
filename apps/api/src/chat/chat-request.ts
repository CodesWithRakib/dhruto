import { UnauthorizedException } from "@nestjs/common";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";
import { sanitizeRequestId, type ChatRequestContext } from "./chat.context.js";

/** Builds the service context from the authenticated user (never from the body). */
export function chatContext(
  user: AuthenticatedUser | null,
  req: RequestWithId,
): ChatRequestContext {
  if (!user) throw new UnauthorizedException("Authentication required");
  return { user, requestId: sanitizeRequestId(req.requestId) };
}
