import type { SharedSettings } from "@input-assist/protocol";
import type { RecorderSettings, SettingsStore } from "./store.js";

export function mergeSharedSettingsIntoRecorder(
  current: RecorderSettings,
  shared: SharedSettings,
): RecorderSettings {
  return {
    ...current,
    activationMode: shared.activationMode ?? current.activationMode,
    spokenPunctuation: shared.spokenPunctuation ?? current.spokenPunctuation,
    appendSpace: shared.appendSpace ?? current.appendSpace,
    showPartialTranscript: shared.showPartialTranscript ?? current.showPartialTranscript,
    personalDictionary: shared.personalDictionary ?? current.personalDictionary,
    ignoreList: shared.ignoreList ?? current.ignoreList,
    technicalDictionary: shared.technicalDictionary ?? current.technicalDictionary,
  };
}


export function publishSettingsSnapshot(
  store: SettingsStore,
  settings: RecorderSettings,
  postMessage: (message: unknown) => void,
): void {
  postMessage({
    type: "SETTINGS_SNAPSHOT",
    settings: store.toSharedSnapshot(settings) satisfies SharedSettings,
  });
}
