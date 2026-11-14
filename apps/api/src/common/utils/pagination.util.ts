export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string | null;
}

export interface CursorPaginationMeta {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
  total?: number;
}

/**
 * Builds standard offset pagination metadata.
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
  nextCursor?: string | null,
): PaginationMeta {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  return {
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1,
    nextCursor: nextCursor ?? null,
  };
}

/**
 * Parses and sanitizes common pagination query parameters.
 */
export function parsePaginationParams(query: {
  page?: unknown;
  limit?: unknown;
  defaultLimit?: number;
  maxLimit?: number;
}): { page: number; limit: number; skip: number } {
  const defaultLimit = query.defaultLimit ?? 20;
  const maxLimit = query.maxLimit ?? 100;

  const rawPage = Number(query.page);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawLimit = Number(query.limit);
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, maxLimit)
      : defaultLimit;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Encodes a keyset cursor string from a timestamp and UUID.
 */
export function encodeCursor(createdAt: Date | string, id: string): string {
  const dateObj = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const raw = `${dateObj.toISOString()}|${id}`;
  return Buffer.from(raw, "utf8").toString("base64url");
}

/**
 * Decodes a keyset cursor string into a Date and UUID.
 */
export function decodeCursor(
  cursor: string | undefined | null,
): { createdAt: Date; id: string } | null {
  if (!cursor || typeof cursor !== "string") return null;
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const separator = raw.lastIndexOf("|");
    if (separator <= 0) return null;
    const createdAt = new Date(raw.slice(0, separator));
    const id = raw.slice(separator + 1);
    if (Number.isNaN(createdAt.getTime()) || !/^[0-9a-f-]{36}$/i.test(id)) {
      return null;
    }
    return { createdAt, id };
  } catch {
    return null;
  }
}
