import { UserModel } from "@input-assist/autocorrect-core";
import { registerInputAssist } from "./background.js";
import { ExtensionSettingsCache } from "./storage/settingsCache.js";
import { ExtensionImePreferences } from "./storage/imePreferences.js";
import { ExtensionUserModelStore } from "./storage/userModelStore.js";

export function bootstrapExtension(chromeApi: typeof chrome): void {
  if (!chromeApi.input?.ime) {
    return;
  }

  const settingsCache = new ExtensionSettingsCache(chromeApi.storage.local);
  const imePreferences = new ExtensionImePreferences(chromeApi.storage.local);

  // Live, mutable user model the engine scores against; persisted on change and
  // hydrated from storage asynchronously after start.
  const userModel = UserModel.empty();
  const userModelStore = new ExtensionUserModelStore(chromeApi.storage.local);

  const app = registerInputAssist(chromeApi, {
    settingsCache,
    imePreferences,
    userModel,
    persistLearning: () => {
      void userModelStore.save(userModel.snapshot());
    },
  });

  void app.hydrateSettingsFromCache();
  void app.hydrateImePreferences();
  void userModelStore.load().then((data) => userModel.hydrate(data));
}

if (typeof chrome !== "undefined" && chrome.runtime?.id) {
  bootstrapExtension(chrome);
}
