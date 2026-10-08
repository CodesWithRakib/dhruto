import { describe, expect, it } from "vitest";
import { cleanTokenValue, getStoredAccessToken } from "../../lib/api/auth-token";
import { installLocalStorageMock } from "./storage-mock";

installLocalStorageMock();

describe("cleanTokenValue", () => {
  it("rejects empty and placeholder values", () => {
    expect(cleanTokenValue(null)).toBeNull();
    expect(cleanTokenValue(undefined)).toBeNull();
    expect(cleanTokenValue("")).toBeNull();
    expect(cleanTokenValue("   ")).toBeNull();
    expect(cleanTokenValue("undefined")).toBeNull();
    expect(cleanTokenValue("null")).toBeNull();
  });

  it("strips wrapping quotes left by naive JSON persistence", () => {
    expect(cleanTokenValue('"abc.def.ghi"')).toBe("abc.def.ghi");
    expect(cleanTokenValue("'abc.def.ghi'")).toBe("abc.def.ghi");
    expect(cleanTokenValue("  abc.def.ghi  ")).toBe("abc.def.ghi");
  });

  it("keeps valid tokens untouched", () => {
    expect(cleanTokenValue("abc.def.ghi")).toBe("abc.def.ghi");
  });
});

describe("getStoredAccessToken", () => {
  it("returns null for garbage instead of sending it as a credential", () => {
    localStorage.setItem("dhruto_access_token", "undefined");
    expect(getStoredAccessToken()).toBeNull();
    localStorage.removeItem("dhruto_access_token");
  });
});
