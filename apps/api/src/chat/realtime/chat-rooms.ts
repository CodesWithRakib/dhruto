/**
 * Room names inside the `/chat` namespace. Rooms are joined ONLY by the
 * server: `u:` at authenticated connection, `c:` after `requireMember`.
 * There is no client-controlled room name anywhere in the protocol.
 */
const USER_PREFIX = "u:";
const CONVERSATION_PREFIX = "c:";

/** All sockets (devices) of one authenticated user. */
export const userRoom = (userId: string): string => `${USER_PREFIX}${userId}`;

/** Sockets currently focused on (joined to) a conversation they may access. */
export const conversationRoom = (conversationId: string): string =>
  `${CONVERSATION_PREFIX}${conversationId}`;

export function conversationIdFromRoom(room: string): string | null {
  return room.startsWith(CONVERSATION_PREFIX) ? room.slice(CONVERSATION_PREFIX.length) : null;
}
