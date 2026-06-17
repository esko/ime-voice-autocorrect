import { describe, expect, it } from "vitest";
import { DEFAULT_RECORDER_SETTINGS, SettingsStore } from "./store.js";

describe("SettingsStore", () => {
  it("persists and reloads settings", () => {
    const memory = new Map<string, string>();
    const store = new SettingsStore({
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, value),
    });

    store.save({ ...DEFAULT_RECORDER_SETTINGS, activationMode: "toggle" });
    expect(store.load().activationMode).toBe("toggle");
  });

  it("exports a non-secret shared snapshot", () => {
    const store = new SettingsStore({
      getItem: () => null,
      setItem: () => {},
    });

    expect(store.toSharedSnapshot(DEFAULT_RECORDER_SETTINGS)).toEqual({
      activationMode: "push-to-talk",
      spokenPunctuation: true,
      appendSpace: false,
      showPartialTranscript: true,
      personalDictionary: [],
      ignoreList: [],
    });
  });
});
