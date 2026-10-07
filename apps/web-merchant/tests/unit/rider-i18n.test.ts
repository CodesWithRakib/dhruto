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

describe("Rider bilingual catalog", () => {
  it("has identical Rider keys in English and Bangla", () => {
    const enKeys = leafKeys((en as { Rider: unknown }).Rider).sort();
    const bnKeys = leafKeys((bn as { Rider: unknown }).Rider).sort();

    expect(enKeys.length).toBeGreaterThan(40);
    expect(bnKeys).toEqual(enKeys);
  });

  it("has no empty Rider strings in either locale", () => {
    for (const [locale, catalog] of [
      ["en", en],
      ["bn", bn],
    ] as const) {
      const walk = (value: unknown, path: string): void => {
        if (typeof value === "string") {
          expect(value.trim(), `${locale}:${path}`).not.toBe("");
        } else if (value !== null && typeof value === "object") {
          for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
            walk(child, `${path}.${key}`);
          }
        }
      };
      walk((catalog as { Rider: unknown }).Rider, "Rider");
    }
  });

  it("covers every delivery failure reason in both locales", () => {
    const reasons = [
      "CUSTOMER_UNAVAILABLE",
      "CUSTOMER_REFUSED",
      "ADDRESS_INCORRECT",
      "PAYMENT_NOT_READY",
      "CUSTOMER_REQUESTED_RESCHEDULE",
      "DAMAGED_PACKAGE",
      "OTHER",
    ];
    const enReasons = (en as { Rider: { failReasons: Record<string, string> } }).Rider.failReasons;
    const bnReasons = (bn as { Rider: { failReasons: Record<string, string> } }).Rider.failReasons;
    for (const reason of reasons) {
      expect(enReasons[reason]?.trim(), `en ${reason}`).toBeTruthy();
      expect(bnReasons[reason]?.trim(), `bn ${reason}`).toBeTruthy();
    }
  });

  it("exposes rider navigation labels in both locales", () => {
    const navEn = (en as { Nav: Record<string, string> }).Nav;
    const navBn = (bn as { Nav: Record<string, string> }).Nav;
    for (const key of ["tasks", "history", "rider", "overview", "profile"]) {
      expect(navEn[key]?.trim(), `en Nav.${key}`).toBeTruthy();
      expect(navBn[key]?.trim(), `bn Nav.${key}`).toBeTruthy();
    }
  });
});
