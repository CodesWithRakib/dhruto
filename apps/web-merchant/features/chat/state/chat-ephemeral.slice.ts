import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type ChatPresenceEntry, type ChatPresenceStatus } from "@dhruto/contracts";

/**
 * Ephemeral realtime state — never persisted, never treated as messages.
 * Kept separate from the timeline so typing/presence churn only re-renders
 * the small components that select it.
 */

export type ChatConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "unauthorized";

export interface PresenceInfo {
  status: ChatPresenceStatus;
  lastSeenAt: string | null;
}

export interface ChatEphemeralState {
  connection: ChatConnectionState;
  /** conversationId -> userId -> expiresAt (epoch ms). */
  typing: Record<string, Record<string, number>>;
  /** Only users visible through joined conversations (backend rule). */
  presence: Record<string, PresenceInfo>;
}

const initialState: ChatEphemeralState = { connection: "idle", typing: {}, presence: {} };

const chatEphemeralSlice = createSlice({
  name: "chatEphemeral",
  initialState,
  reducers: {
    connectionChanged(state, action: PayloadAction<ChatConnectionState>) {
      state.connection = action.payload;
      // Presence/typing are only meaningful while connected: never show stale state.
      if (action.payload !== "connected") {
        state.typing = {};
        state.presence = {};
      }
    },
    typingReceived(
      state,
      action: PayloadAction<{ conversationId: string; userId: string; isTyping: boolean; expiresAt: number }>,
    ) {
      const { conversationId, userId, isTyping, expiresAt } = action.payload;
      const conversation = (state.typing[conversationId] ??= {});
      if (isTyping) conversation[userId] = expiresAt;
      else delete conversation[userId];
    },
    typingPruned(state, action: PayloadAction<number>) {
      for (const [conversationId, users] of Object.entries(state.typing)) {
        for (const [userId, expiresAt] of Object.entries(users)) {
          if (expiresAt <= action.payload) delete users[userId];
        }
        if (Object.keys(users).length === 0) delete state.typing[conversationId];
      }
    },
    typingCleared(state, action: PayloadAction<string>) {
      delete state.typing[action.payload];
    },
    presenceSnapshot(state, action: PayloadAction<ChatPresenceEntry[]>) {
      for (const entry of action.payload) {
        state.presence[entry.userId] = { status: entry.status, lastSeenAt: entry.lastSeenAt };
      }
    },
    presenceReceived(state, action: PayloadAction<ChatPresenceEntry>) {
      state.presence[action.payload.userId] = {
        status: action.payload.status,
        lastSeenAt: action.payload.lastSeenAt,
      };
    },
  },
});

export const {
  connectionChanged,
  typingReceived,
  typingPruned,
  typingCleared,
  presenceSnapshot,
  presenceReceived,
} = chatEphemeralSlice.actions;

export default chatEphemeralSlice.reducer;
