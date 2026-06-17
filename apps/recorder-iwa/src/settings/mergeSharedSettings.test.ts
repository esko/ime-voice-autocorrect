import { describe, expect, it } from "vitest";
import { DEFAULT_RECORDER_SETTINGS } from "./store.js";
import { mergeSharedSettingsIntoRecorder } from "./publishSnapshot.js";

describe("mergeSharedSettingsIntoRecorder", () => {
  it("merges shared settings without touching the api key", () => {
    const merged = mergeSharedSettingsIntoRecorder(
      { ...DEFAULT_RECORDER_SETTINGS, elevenLabsApiKey: "sk_secret" },
      {
        activationMode: "toggle",
        personalDictionary: ["Input Assist"],
      },
    );

    expect(merged.activationMode).toBe("toggle");
    expect(merged.personalDictionary).toEqual(["Input Assist"]);
    expect(merged.elevenLabsApiKey).toBe("sk_secret");
  });
});
