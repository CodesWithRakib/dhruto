/**
 * Socket.IO servers live on the API origin (without the REST `/api/v1`
 * prefix). Derived from `NEXT_PUBLIC_API_URL` so REST and sockets always
 * target the same backend. Shared by the notification and chat sockets.
 */
export function apiSocketOrigin(apiUrl: string | undefined = process.env.NEXT_PUBLIC_API_URL): string {
  const fallback = "http://localhost:4000";
  if (!apiUrl) return fallback;
  try {
    const parsed = new URL(apiUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return fallback;
  }
}
