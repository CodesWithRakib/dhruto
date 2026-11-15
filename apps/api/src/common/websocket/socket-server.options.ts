import { type IncomingMessage } from "node:http";
import { type ServerOptions } from "socket.io";

/**
 * Shared Socket.IO server options (finding S-2).
 *
 * Both gateways (NotificationsGateway on "/", ChatGateway on "/chat") run on
 * ONE Socket.IO server per port. NestJS creates that server with the options
 * of whichever gateway initialises first, so every gateway must spread these
 * identical options — never inline its own.
 *
 * Origin policy:
 *  - Trusted origins come from `WS_CORS_ORIGINS` (comma-separated), falling
 *    back to the REST `CORS_ORIGIN` so REST and sockets stay aligned.
 *  - A literal "*" is never honoured: credentialed connections must not be
 *    open to arbitrary origins.
 *  - Production with nothing configured fails CLOSED for browser origins;
 *    development defaults to the local web app (localhost:5000).
 *  - `cors` only governs HTTP long-polling. Browsers do NOT apply CORS to
 *    WebSocket upgrades, so `allowRequest` enforces the same allowlist on every
 *    handshake (polling and websocket) using the `Origin` header.
 *  - Requests without an `Origin` header (native/mobile apps, server-side
 *    clients) are allowed: browsers always send Origin, and every connection
 *    still requires a valid access token.
 *  - Values are read lazily per handshake: gateway decorators are evaluated
 *    before ConfigModule loads `.env`.
 */

const DEV_DEFAULT_ORIGINS = ["http://localhost:5000", "http://127.0.0.1:5000"];

/** Max inbound packet size. Chat socket events are tiny; content goes via REST. */
export const SOCKET_MAX_HTTP_BUFFER_SIZE = 64 * 1024;

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "").toLowerCase();
}

/** Trusted origins for the current environment (never contains "*"). */
export function trustedSocketOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.WS_CORS_ORIGINS ?? env.CORS_ORIGIN ?? "";
  const configured = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value !== "*")
    .map(normalizeOrigin);
  if (configured.length > 0) return configured;
  return env.NODE_ENV === "production" ? [] : DEV_DEFAULT_ORIGINS.map(normalizeOrigin);
}

export function isSocketOriginAllowed(
  origin: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (origin === undefined || origin === "") return true; // non-browser client
  return trustedSocketOrigins(env).includes(normalizeOrigin(origin));
}

export const SOCKET_SERVER_OPTIONS = {
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ): void => callback(null, isSocketOriginAllowed(origin)),
    credentials: true,
  },
  allowRequest: (
    req: IncomingMessage,
    callback: (err: string | null | undefined, success: boolean) => void,
  ): void => {
    const origin = req.headers.origin;
    callback(null, isSocketOriginAllowed(typeof origin === "string" ? origin : undefined));
  },
  maxHttpBufferSize: SOCKET_MAX_HTTP_BUFFER_SIZE,
  pingInterval: 10000,
  pingTimeout: 5000,
} satisfies Partial<ServerOptions>;
