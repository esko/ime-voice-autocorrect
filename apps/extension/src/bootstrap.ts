import { registerInputAssist } from "./background.js";
import { ExtensionSettingsCache } from "./storage/settingsCache.js";
import { ExtensionImePreferences } from "./storage/imePreferences.js";

export function bootstrapExtension(chromeApi: typeof chrome): void {
  if (!chromeApi.input?.ime) {
    return;
  }

  const settingsCache = new ExtensionSettingsCache(chromeApi.storage.local);
  const imePreferences = new ExtensionImePreferences(chromeApi.storage.local);

  const app = registerInputAssist(chromeApi, { settingsCache, imePreferences });

  void app.hydrateSettingsFromCache();
  void app.hydrateImePreferences();
}

if (typeof chrome !== "undefined" && chrome.runtime?.id) {
  bootstrapExtension(chrome);
}
