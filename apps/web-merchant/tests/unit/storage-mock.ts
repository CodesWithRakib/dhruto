import { beforeEach } from "vitest";

/**
 * The jsdom setup in this repo exposes `sessionStorage` but not
 * `localStorage`. Install a spec-compliant in-memory stand-in on both
 * `window` and `globalThis` so token persistence can be tested.
 */
function createStorageMock(): Storage {
  const backing = new Map<string, string>();
  return {
    get length() {
      return backing.size;
    },
    clear: () => {
      backing.clear();
    },
    getItem: (key: string) => backing.get(key) ?? null,
    key: (index: number) => Array.from(backing.keys())[index] ?? null,
    removeItem: (key: string) => {
      backing.delete(key);
    },
    setItem: (key: string, value: string) => {
      backing.set(key, String(value));
    },
  };
}

export function installLocalStorageMock(): void {
  beforeEach(() => {
    const mock = createStorageMock();
    Object.defineProperty(window, "localStorage", {
      value: mock,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: mock,
      configurable: true,
      writable: true,
    });
  });
}
