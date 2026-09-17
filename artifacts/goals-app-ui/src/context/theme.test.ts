import assert from "node:assert/strict";
import { readStoredTheme } from "./theme-storage";

const prev = globalThis.localStorage;
const store = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  },
});

store.clear();
assert.equal(readStoredTheme(), "dark");

store.set("theme", "light");
assert.equal(readStoredTheme(), "light");

store.set("theme", "dark");
assert.equal(readStoredTheme(), "dark");

store.set("theme", "nope");
assert.equal(readStoredTheme(), "dark");

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: prev,
});
console.log("theme-storage: ok");
