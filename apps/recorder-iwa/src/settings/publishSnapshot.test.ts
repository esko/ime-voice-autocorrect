import { describe, expect, it, vi } from "vitest";
import { DEFAULT_RECORDER_SETTINGS, SettingsStore } from "./store.js";
import { publishSettingsSnapshot } from "./publishSnapshot.js";

describe("publishSettingsSnapshot", () => {
  it("sends a settings snapshot over the bridge port", () => {
    const store = new SettingsStore({
      getItem: () => null,
      setItem: vi.fn(),
    });
    const postMessage = vi.fn();
    const settings = {
      ...DEFAULT_RECORDER_SETTINGS,
      personalDictionary: ["esko"],
    };

    publishSettingsSnapshot(store, settings, postMessage);

    expect(postMessage).toHaveBeenCalledWith({
      type: "SETTINGS_SNAPSHOT",
      settings: expect.objectContaining({
        personalDictionary: ["esko"],
      }),
    });
  });
});
