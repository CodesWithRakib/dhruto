import { describe, expect, it } from "vitest";
import { redactUrl } from "./redact-url.js";

describe("redactUrl (access-log hygiene)", () => {
  it("redacts staff reasons and search text but keeps other params", () => {
    expect(
      redactUrl("/api/v1/chat/admin/conversations/1?reason=Customer%20Rahim%20complaint&limit=50"),
    ).toBe("/api/v1/chat/admin/conversations/1?reason=[redacted]&limit=50");
    expect(redactUrl("/api/v1/chat/search?q=secret+words&conversationId=x")).toBe(
      "/api/v1/chat/search?q=[redacted]&conversationId=x",
    );
  });

  it("redacts credential-like params case-insensitively", () => {
    expect(redactUrl("/x?X-Amz-Signature=abc&Token=t&ok=1")).toBe(
      "/x?X-Amz-Signature=[redacted]&Token=[redacted]&ok=1",
    );
  });

  it("leaves paths without a query untouched and tolerates malformed encoding", () => {
    expect(redactUrl("/api/v1/health")).toBe("/api/v1/health");
    expect(redactUrl(undefined)).toBe("unknown");
    expect(redactUrl("/x?%E0%A4%A=1&reason=r")).toBe("/x?%E0%A4%A=1&reason=[redacted]");
  });
});
