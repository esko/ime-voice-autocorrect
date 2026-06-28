import { UserModel } from "@input-assist/autocorrect-core";
import { registerInputAssist } from "./background.js";
import { loadEnglishValidator } from "./autocorrect/nspellValidator.js";
import { loadEnglishContext } from "./autocorrect/contextLoader.js";
import { loadEnglishDictionary } from "./autocorrect/dictionaryLoader.js";
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

  // Upgrade to the Hunspell validator once its bundled dictionary loads. Until
  // then the frequency list alone drives corrections.
  // Upgrade the engine once the bundled data loads: Hunspell validator, the full
  // n-gram context corpus, and the real frequency dictionary. The dictionary is
  // applied last (its larger SymSpell index is the one costly rebuild); the small
  // built-in dictionary handles the most common typos until then.
  const url = (path: string) => chromeApi.runtime.getURL(path);
  void loadEnglishValidator(url)
    .then((validator) => app.setValidator(validator))
    .catch(() => {});
  void loadEnglishContext(url)
    .then((context) => app.setContext(context))
    .catch(() => {});
  void loadEnglishDictionary(url)
    .then((dictionary) => app.setDictionary(dictionary))
    .catch(() => {});
}

if (typeof chrome !== "undefined" && chrome.runtime?.id) {
  bootstrapExtension(chrome);
}
