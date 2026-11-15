import { describe, it, expect } from "vitest";
import { ChatMessageType, sendChatMessageSchema } from "@dhruto/contracts";
import { DhrutoValidationException } from "../common/pipes/validation.pipe.js";
import { sanitizeRequestId } from "./chat.context.js";
import { buildPreview } from "./services/chat-message.service.js";
import { ZodValidationPipe } from "./pipes/zod-validation.pipe.js";

describe("sanitizeRequestId", () => {
  it("keeps short safe tokens", () => {
    expect(sanitizeRequestId("req-123_abc:9.x")).toBe("req-123_abc:9.x");
  });

  it("drops oversized, unsafe or non-string ids (outbox contract caps at 128)", () => {
    expect(sanitizeRequestId("x".repeat(129))).toBeNull();
    expect(sanitizeRequestId("<script>")).toBeNull();
    expect(sanitizeRequestId("a b")).toBeNull();
    expect(sanitizeRequestId(undefined)).toBeNull();
    expect(sanitizeRequestId(42)).toBeNull();
  });
});

describe("buildPreview", () => {
  it("uses trimmed text, bounded to 280 chars", () => {
    expect(buildPreview(ChatMessageType.TEXT, "  hi  ")).toBe("hi");
    expect(buildPreview(ChatMessageType.TEXT, "x".repeat(500))).toHaveLength(280);
  });

  it("falls back to neutral labels for media and cleared content", () => {
    expect(buildPreview(ChatMessageType.IMAGE, null)).toBe("[Image]");
    expect(buildPreview(ChatMessageType.VOICE, null)).toBe("[Voice message]");
    expect(buildPreview(ChatMessageType.LOCATION, "Gate 3")).toBe("Gate 3");
  });
});

describe("ZodValidationPipe", () => {
  const pipe = new ZodValidationPipe(sendChatMessageSchema);

  it("returns parsed data for valid input", () => {
    const parsed = pipe.transform({
      type: "TEXT",
      clientMessageId: "5f0c1a0e-8c2b-4a57-9c6e-2a7b1f3d4e5a",
      content: " hello ",
    });
    expect(parsed).toMatchObject({ type: "TEXT", content: "hello" });
  });

  it("throws the platform 422 VALIDATION_ERROR shape and rejects smuggled fields", () => {
    try {
      pipe.transform({
        type: "TEXT",
        clientMessageId: "5f0c1a0e-8c2b-4a57-9c6e-2a7b1f3d4e5a",
        content: "hi",
        senderId: "5f0c1a0e-8c2b-4a57-9c6e-2a7b1f3d4e5a",
      });
      expect.unreachable("validation should fail");
    } catch (error) {
      expect(error).toBeInstanceOf(DhrutoValidationException);
      const ex = error as DhrutoValidationException;
      expect(ex.getStatus()).toBe(422);
      expect(ex.errors.length).toBeGreaterThan(0);
    }
  });
});
