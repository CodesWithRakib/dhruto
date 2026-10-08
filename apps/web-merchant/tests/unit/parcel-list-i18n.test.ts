import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
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

function readNamespace(catalog: unknown, namespace: string): unknown {
  return (catalog as Record<string, unknown>)[namespace];
}

function hasKey(catalog: unknown, namespace: string, key: string): boolean {
  const value = key
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node !== null && typeof node === "object"
          ? (node as Record<string, unknown>)[part]
          : undefined,
      readNamespace(catalog, namespace),
    );
  return value !== undefined;
}

/** Files that render the shipment list surface. */
const COMPONENT_DIR = path.resolve(__dirname, "../../features/parcels/components");
const FILES = [
  "parcel-list.tsx",
  "parcel-card.tsx",
  "parcel-sort-select.tsx",
  "parcel-filters.tsx",
];

/**
 * Every `t("…")` literal must resolve in both locales. A missing key is not a
 * type error — it renders as a raw key or throws at runtime — so this is the
 * only check that catches it.
 */
describe("shipment list translations", () => {
  it("has identical ParcelList and DataTable keys in English and Bangla", () => {
    const minimumKeys: Record<string, number> = { ParcelList: 50, DataTable: 5 };
    for (const namespace of ["ParcelList", "DataTable"]) {
      const enKeys = leafKeys(readNamespace(en, namespace)).sort();
      const bnKeys = leafKeys(readNamespace(bn, namespace)).sort();
      // Guards against a namespace silently disappearing from a message bundle.
      expect(enKeys.length).toBeGreaterThanOrEqual(minimumKeys[namespace] as number);
      expect(bnKeys).toEqual(enKeys);
    }
  });

  it("has no empty ParcelList or DataTable strings in either locale", () => {
    for (const [locale, catalog] of [
      ["en", en],
      ["bn", bn],
    ] as const) {
      for (const namespace of ["ParcelList", "DataTable"]) {
        const walk = (value: unknown, prefix: string): void => {
          if (typeof value === "string") {
            expect(value.trim(), `${locale}:${prefix}`).not.toBe("");
          } else if (value !== null && typeof value === "object") {
            for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
              walk(child, `${prefix}.${key}`);
            }
          }
        };
        walk(readNamespace(catalog, namespace), namespace);
      }
    }
  });

  it("resolves every literal translation key used by the components", () => {
    const missing: string[] = [];

    for (const file of FILES) {
      const source = fs.readFileSync(path.join(COMPONENT_DIR, file), "utf8");

      // Bind `const tX = useTranslations("Namespace")` → namespace per identifier.
      const bindings = new Map<string, string>();
      for (const match of source.matchAll(
        /const\s+(\w+)\s*=\s*useTranslations\(\s*"([^"]+)"\s*\)/g,
      )) {
        bindings.set(match[1] as string, match[2] as string);
      }
      expect(bindings.size, `${file} binds at least one namespace`).toBeGreaterThan(0);

      for (const [identifier, namespace] of bindings) {
        const pattern = new RegExp(String.raw`\b${identifier}\(\s*"([^"]+)"`, "g");
        for (const match of source.matchAll(pattern)) {
          const key = match[1] as string;
          if (!hasKey(en, namespace, key)) missing.push(`${file}: en ${namespace}.${key}`);
          if (!hasKey(bn, namespace, key)) missing.push(`${file}: bn ${namespace}.${key}`);
        }
      }
    }

    // Sort keys are addressed dynamically (t(`sort.${option.value}`)).
    for (const option of ["newest", "updated", "oldest", "codHigh", "codLow"]) {
      if (!hasKey(en, "ParcelList", `sort.${option}`)) missing.push(`en ParcelList.sort.${option}`);
      if (!hasKey(bn, "ParcelList", `sort.${option}`)) missing.push(`bn ParcelList.sort.${option}`);
    }

    expect(missing).toEqual([]);
  });
});
