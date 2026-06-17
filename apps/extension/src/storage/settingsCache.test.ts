import { describe, expect, it } from "vitest";
import { ExtensionSettingsCache } from "./settingsCache.js";

describe("ExtensionSettingsCache", () => {
  it("stores shared settings without secrets", async () => {
    const memory: Record<string, unknown> = {};
    const cache = new ExtensionSettingsCache({
      get: async (keys) =>
        Object.fromEntries(keys.map((key) => [key, memory[key] ?? null])),
      set: async (items) => {
        Object.assign(memory, items);
      },
    });

    await cache.save({ activationMode: "toggle", spokenPunctuation: true });
    expect(await cache.load()).toEqual({
      activationMode: "toggle",
      spokenPunctuation: true,
    });
  });
});
