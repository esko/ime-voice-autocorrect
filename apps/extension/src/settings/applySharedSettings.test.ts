import { describe, expect, it } from "vitest";
import {
  sharedSettingsToDictationConfig,
  sharedSettingsToSessionConfig,
} from "./applySharedSettings.js";

describe("applySharedSettings", () => {
  it("maps shared settings onto session config with defaults", () => {
    expect(
      sharedSettingsToSessionConfig({
        activationMode: "toggle",
        spokenPunctuation: false,
      }),
    ).toEqual({
      activationMode: "toggle",
      languageHint: "auto",
      spokenPunctuation: false,
      appendSpace: false,
    });
  });

  it("preserves current values for omitted fields", () => {
    expect(
      sharedSettingsToSessionConfig(
        { languageHint: "fi" },
        {
          activationMode: "toggle",
          languageHint: "auto",
          spokenPunctuation: true,
          appendSpace: true,
        },
      ),
    ).toEqual({
      activationMode: "toggle",
      languageHint: "fi",
      spokenPunctuation: true,
      appendSpace: true,
    });
  });

  it("maps dictation config without language hint", () => {
    expect(sharedSettingsToDictationConfig({ activationMode: "toggle" })).toEqual({
      activationMode: "toggle",
      spokenPunctuation: true,
      appendSpace: false,
    });
  });
});
