import { describe, expect, it } from "vitest";
import { ExtensionUserModelStore } from "./userModelStore.js";
import { emptyLearningData } from "@input-assist/autocorrect-core";

describe("ExtensionUserModelStore", () => {
  it("returns empty learning data when nothing is stored", async () => {
    const store = new ExtensionUserModelStore({
      get: async () => ({}),
      set: async () => {},
    });
    expect(await store.load()).toEqual(emptyLearningData());
  });

  it("round-trips learning data", async () => {
    const memory: Record<string, unknown> = {};
    const store = new ExtensionUserModelStore({
      get: async (keys) =>
        Object.fromEntries(keys.map((key) => [key, memory[key] ?? null])),
      set: async (items) => {
        Object.assign(memory, items);
      },
    });

    const data = {
      acceptedCorrections: { "teh→the": 2 },
      rejectedCorrections: {},
      acceptedWords: { esko: 1 },
    };
    await store.save(data);
    expect(await store.load()).toEqual(data);
  });
});
