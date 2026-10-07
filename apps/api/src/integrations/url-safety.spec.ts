import { describe, it, expect } from "vitest";
import { assertSafeWebhookUrl } from "./url-safety.util.js";

describe("webhook SSRF protection", () => {
  it("rejects localhost", async () => {
    await expect(assertSafeWebhookUrl("https://localhost/hook")).rejects.toMatchObject({
      error: "WEBHOOK_FORBIDDEN_URL",
    });
  });

  it("rejects 127.0.0.1", async () => {
    await expect(assertSafeWebhookUrl("http://127.0.0.1/hook")).rejects.toMatchObject({
      error: "WEBHOOK_FORBIDDEN_URL",
    });
  });

  it("rejects private ranges (10/8, 192.168/16)", async () => {
    await expect(assertSafeWebhookUrl("https://10.0.0.5/hook")).rejects.toMatchObject({
      error: "WEBHOOK_FORBIDDEN_URL",
    });
    await expect(assertSafeWebhookUrl("https://192.168.1.10/hook")).rejects.toMatchObject({
      error: "WEBHOOK_FORBIDDEN_URL",
    });
  });

  it("rejects link-local metadata address", async () => {
    await expect(assertSafeWebhookUrl("http://169.254.169.254/latest")).rejects.toMatchObject({
      error: "WEBHOOK_FORBIDDEN_URL",
    });
  });

  it("rejects non-http(s) protocols", async () => {
    await expect(assertSafeWebhookUrl("ftp://example.com/hook")).rejects.toMatchObject({
      error: "WEBHOOK_INVALID_URL",
    });
  });

  it("rejects credentials embedded in the URL", async () => {
    await expect(assertSafeWebhookUrl("https://user:pass@example.com/hook")).rejects.toMatchObject({
      error: "WEBHOOK_INVALID_URL",
    });
  });

  it("rejects unresolvable hostnames", async () => {
    await expect(
      assertSafeWebhookUrl("https://nonexistent-invalid-host-xyz12345.test/hook"),
    ).rejects.toMatchObject({ error: "WEBHOOK_INVALID_URL" });
  });
});
