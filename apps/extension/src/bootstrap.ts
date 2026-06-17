import { BridgeHeartbeat } from "./bridge/heartbeat.js";
import { connectExternalRecorder, registerInputAssist } from "./background.js";
import { createChromeImeAdapter } from "./ime/chromeImeAdapter.js";
import { createChromeOsRecorderLauncher } from "./recorder/chromeOsLauncher.js";
import { ExtensionSettingsCache } from "./storage/settingsCache.js";
import { ExtensionImePreferences } from "./storage/imePreferences.js";

export const RECORDER_ORIGIN_PREFIX = "isolated-app://";

export function bootstrapExtension(chromeApi: typeof chrome): void {
  if (!chromeApi.input?.ime) {
    return;
  }

  let activeContext: chrome.input.ime.InputContext | null = null;
  const imeAdapter = createChromeImeAdapter(
    chromeApi,
    () => activeContext,
    () => "input-assist-us",
  );
  const settingsCache = new ExtensionSettingsCache(chromeApi.storage.local);
  const imePreferences = new ExtensionImePreferences(chromeApi.storage.local);

  const launcher = createChromeOsRecorderLauncher({
    extensionId: chromeApi.runtime.id,
    tabs: chromeApi.tabs,
    storage: chromeApi.storage.local,
  });

  const app = registerInputAssist(chromeApi, {
    allowedOrigin: RECORDER_ORIGIN_PREFIX,
    launchRecorder: () => launcher.launch(),
    imeAdapter,
    settingsCache,
    imePreferences,
  });

  void app.hydrateSettingsFromCache();
  void app.hydrateImePreferences();
  app.refreshAllImeMenus();

  const heartbeat = new BridgeHeartbeat(app.bridge);
  heartbeat.start();

  chromeApi.runtime.onConnectExternal.addListener((port) => {
    const senderUrl = port.sender?.url ?? "";
    if (!connectExternalRecorder(app, port, senderUrl)) {
      port.disconnect();
    }
  });
}

if (typeof chrome !== "undefined" && chrome.runtime?.id) {
  bootstrapExtension(chrome);
}
