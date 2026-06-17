import { createRecorderApp } from "./app.js";
import {
  createDefaultAudioPipelineFactory,
  createRealtimeSocketFactory,
} from "./asr/createRealtimeSocket.js";
import { SettingsStore } from "./settings/store.js";

export function bootstrapRecorder(extensionId: string): ReturnType<typeof createRecorderApp> {
  const storage = {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
  };
  const settings = new SettingsStore(storage);

  const app = createRecorderApp({
    extensionId,
    createPort: () => chrome.runtime.connect(extensionId),
    storage,
    audioPipelineFactory: createDefaultAudioPipelineFactory(),
    socketFactory: createRealtimeSocketFactory({
      getApiKey: () => settings.load().elevenLabsApiKey || null,
    }),
  });

  app.bridgeClient.connectBridge();
  return app;
}

const extensionId = new URLSearchParams(globalThis.location?.search ?? "").get("extensionId") ?? "";
if (typeof chrome !== "undefined" && extensionId) {
  bootstrapRecorder(extensionId);
}
