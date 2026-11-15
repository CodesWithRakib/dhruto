import { describe, it, expect } from "vitest";
import {
  CHAT_SOCKET_NAMESPACE,
  ChatClientEvent,
  ChatServerEvent,
  chatSocketConversationSchema,
  chatSocketDeliveredSchema,
  chatSocketReadSchema,
} from "../index.js";

const UUID = "5f0c1a0e-8c2b-4a57-9c6e-2a7b1f3d4e5a";

describe("realtime contracts", () => {
  it("uses a dedicated namespace and never the legacy reserved 'chat:' prefix", () => {
    expect(CHAT_SOCKET_NAMESPACE).toBe("/chat");
    for (const event of [...Object.values(ChatClientEvent), ...Object.values(ChatServerEvent)]) {
      expect(event.startsWith("chat:")).toBe(false);
    }
  });

  it("client and server event names are unique", () => {
    const all = [...Object.values(ChatClientEvent), ...Object.values(ChatServerEvent)];
    expect(new Set(all).size).toBe(all.length);
  });

  it("client payloads are strict: no smuggled identity or room names", () => {
    expect(chatSocketConversationSchema.safeParse({ conversationId: UUID }).success).toBe(true);
    expect(
      chatSocketConversationSchema.safeParse({ conversationId: UUID, userId: UUID }).success,
    ).toBe(false);
    expect(chatSocketConversationSchema.safeParse({ conversationId: "u:victim" }).success).toBe(
      false,
    );
    expect(chatSocketConversationSchema.safeParse({ room: "c:anything" }).success).toBe(false);
  });

  it("cursor payloads require BIGINT-string sequences", () => {
    expect(
      chatSocketReadSchema.safeParse({ conversationId: UUID, lastReadSequence: "5" }).success,
    ).toBe(true);
    expect(
      chatSocketReadSchema.safeParse({ conversationId: UUID, lastReadSequence: 5 }).success,
    ).toBe(false);
    expect(
      chatSocketDeliveredSchema.safeParse({ conversationId: UUID, lastDeliveredSequence: "-1" })
        .success,
    ).toBe(false);
  });
});
