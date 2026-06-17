import { describe, expect, it } from "vitest";
import { DEFAULT_IME_PREFERENCES, ExtensionImePreferences } from "./imePreferences.js";

describe("ExtensionImePreferences", () => {
  it("persists autocorrect and dictation toggles", async () => {
    const memory: Record<string, unknown> = {};
    const preferences = new ExtensionImePreferences({
      get: async (keys) =>
        Object.fromEntries(keys.map((key) => [key, memory[key] ?? null])),
      set: async (items) => {
        Object.assign(memory, items);
      },
    });

    await preferences.save({ autocorrectEnabled: false, dictationEnabled: true });
    expect(await preferences.load()).toEqual({
      autocorrectEnabled: false,
      dictationEnabled: true,
    });
    expect(await preferences.load()).not.toEqual(DEFAULT_IME_PREFERENCES);
  });
});
