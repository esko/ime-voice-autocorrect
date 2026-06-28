import { describe, expect, it } from "vitest";
import { ExtensionSettingsCache } from "./settingsCache.js";

describe("ExtensionSettingsCache", () => {
  it("stores and loads autocorrect word lists", async () => {
    const memory: Record<string, unknown> = {};
    const cache = new ExtensionSettingsCache({
      get: async (keys) =>
        Object.fromEntries(keys.map((key) => [key, memory[key] ?? null])),
      set: async (items) => {
        Object.assign(memory, items);
      },
    });

    await cache.save({ personalDictionary: ["foo"], ignoreList: ["bar"] });
    expect(await cache.load()).toEqual({
      personalDictionary: ["foo"],
      ignoreList: ["bar"],
    });
  });
});
