import type { SharedSettings } from "@input-assist/protocol";
import type { DictationSessionConfig } from "@input-assist/protocol";
import { DEFAULT_DICTATION_CONFIG } from "@input-assist/dictation-core";

const DEFAULT_SESSION_CONFIG: DictationSessionConfig = {
  activationMode: DEFAULT_DICTATION_CONFIG.activationMode,
  languageHint: "auto",
  spokenPunctuation: DEFAULT_DICTATION_CONFIG.spokenPunctuation,
  appendSpace: DEFAULT_DICTATION_CONFIG.appendSpace,
};

export function sharedSettingsToSessionConfig(
  settings: SharedSettings,
  current: DictationSessionConfig = DEFAULT_SESSION_CONFIG,
): DictationSessionConfig {
  return {
    activationMode: settings.activationMode ?? current.activationMode,
    languageHint: settings.languageHint ?? current.languageHint,
    spokenPunctuation: settings.spokenPunctuation ?? current.spokenPunctuation,
    appendSpace: settings.appendSpace ?? current.appendSpace,
  };
}

export function sharedSettingsToDictationConfig(
  settings: SharedSettings,
  current = DEFAULT_DICTATION_CONFIG,
) {
  return {
    activationMode: settings.activationMode ?? current.activationMode,
    spokenPunctuation: settings.spokenPunctuation ?? current.spokenPunctuation,
    appendSpace: settings.appendSpace ?? current.appendSpace,
  };
}
