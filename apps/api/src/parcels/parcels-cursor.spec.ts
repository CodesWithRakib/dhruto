import { describe, it, expect } from "vitest";
import { encodeParcelCursor, decodeParcelCursor } from "./parcels.service.js";

describe("parcel keyset cursor", () => {
  it("round-trips createdAt + id opaquely", () => {
    const createdAt = new Date("2026-10-01T12:00:00.000Z");
    const id = "d2c58e83-5991-4469-8bf8-34a200236cf8";
    const cursor = encodeParcelCursor(createdAt, id);
    expect(cursor).not.toContain("|");
    expect(cursor).not.toContain(id);
    const decoded = decodeParcelCursor(cursor);
    expect(decoded?.createdAt.toISOString()).toBe(createdAt.toISOString());
    expect(decoded?.id).toBe(id);
  });

  it("rejects garbage without throwing (falls back to offset)", () => {
    expect(decodeParcelCursor(undefined)).toBeNull();
    expect(decodeParcelCursor("")).toBeNull();
    expect(decodeParcelCursor("not-a-cursor!!!")).toBeNull();
    expect(
      decodeParcelCursor(Buffer.from("no-separator", "utf8").toString("base64url")),
    ).toBeNull();
    expect(
      decodeParcelCursor(
        Buffer.from("bad-date|d2c58e83-5991-4469-8bf8-34a200236cf8", "utf8").toString("base64url"),
      ),
    ).toBeNull();
  });
});
