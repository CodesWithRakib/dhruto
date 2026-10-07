import { describe, it, expect } from "vitest";
import { canonicalPhone, isValidBangladeshPhone, hashPhone, maskPhone } from "./phone-hash.util.js";

describe("phone privacy (intelligence identity)", () => {
  it("canonicalizes +880/880/01 forms to 01XXXXXXXXX", () => {
    expect(canonicalPhone("+8801712345678")).toBe("01712345678");
    expect(canonicalPhone("8801712345678")).toBe("01712345678");
    expect(canonicalPhone("01712345678")).toBe("01712345678");
    expect(canonicalPhone("017-1234-5678")).toBe("01712345678");
  });

  it("validates operator prefixes and length", () => {
    expect(isValidBangladeshPhone("01712345678")).toBe(true);
    expect(isValidBangladeshPhone("01999999999")).toBe(true);
    expect(isValidBangladeshPhone("01212345678")).toBe(false);
    expect(isValidBangladeshPhone("12345")).toBe(false);
  });

  it("hashes deterministically to 64-hex without embedding raw digits", () => {
    const a = hashPhone("01712345678");
    const b = hashPhone("+8801712345678");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).not.toContain("1712345678");
    expect(hashPhone("01812345678")).not.toBe(a);
  });

  it("masks for support display (last 4 only)", () => {
    expect(maskPhone("01712345678")).toBe("****5678");
  });
});
