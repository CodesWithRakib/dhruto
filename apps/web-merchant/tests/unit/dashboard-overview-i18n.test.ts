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

type Catalog = { Index: Record<string, unknown> };

describe("merchant dashboard overview bilingual catalog", () => {
  it("has identical Index keys in English and Bangla", () => {
    const enKeys = leafKeys((en as unknown as Catalog).Index).sort();
    const bnKeys = leafKeys((bn as unknown as Catalog).Index).sort();

    expect(enKeys.length).toBeGreaterThan(60);
    expect(bnKeys).toEqual(enKeys);
  });

  it("has no empty Index strings in either locale", () => {
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
      walk((catalog as unknown as Catalog).Index, "Index");
    }
  });

  it("exposes the overview sections the dashboard renders", () => {
    const enIndex = (en as unknown as Catalog).Index as Record<string, unknown>;
    const bnIndex = (bn as unknown as Catalog).Index as Record<string, unknown>;

    for (const key of [
      "headerContext",
      "health",
      "attention",
      "performance",
      "emptyOverviewTitle",
      "emptyOverviewDescription",
      "recentErrorTitle",
      "recentErrorDescription",
    ]) {
      expect(enIndex[key], `en Index.${key}`).toBeDefined();
      expect(bnIndex[key], `bn Index.${key}`).toBeDefined();
    }
  });
});
