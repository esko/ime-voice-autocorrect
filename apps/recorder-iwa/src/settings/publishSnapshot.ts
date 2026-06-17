import type { SharedSettings } from "@input-assist/protocol";
import type { RecorderSettings, SettingsStore } from "./store.js";

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
