import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      leafKeys(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

describe("Finance bilingual catalog", () => {
  it("has identical Finance keys in English and Bangla", () => {
    const enKeys = leafKeys((en as { Finance: unknown }).Finance).sort();
    const bnKeys = leafKeys((bn as { Finance: unknown }).Finance).sort();

    expect(enKeys.length).toBeGreaterThan(60);
    expect(bnKeys).toEqual(enKeys);
  });

  it("has no empty Finance strings in either locale", () => {
    for (const [locale, catalog] of [["en", en], ["bn", bn]] as const) {
      const walk = (value: unknown, path: string): void => {
        if (typeof value === "string") {
          expect(value.trim(), `${locale}:${path}`).not.toBe("");
        } else if (value !== null && typeof value === "object") {
          for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
            walk(child, `${path}.${key}`);
          }
        }
      };
      walk((catalog as { Finance: unknown }).Finance, "Finance");
    }
  });

  it("exposes finance navigation labels in both locales", () => {
    const navEn = (en as { Nav: Record<string, string> }).Nav;
    const navBn = (bn as { Nav: Record<string, string> }).Nav;
    for (const key of ["finance", "financials", "cash"]) {
      expect(navEn[key]?.trim(), `en Nav.${key}`).toBeTruthy();
      expect(navBn[key]?.trim(), `bn Nav.${key}`).toBeTruthy();
    }
  });
});
