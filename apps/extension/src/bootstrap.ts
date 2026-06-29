import { UserModel, emptyLearningData, type UserLearningData } from "@input-assist/autocorrect-core";
import { registerInputAssist } from "./background.js";
import { loadEnglishValidator } from "./autocorrect/nspellValidator.js";
import { loadEnglishContext } from "./autocorrect/contextLoader.js";
import { loadEnglishDictionary } from "./autocorrect/dictionaryLoader.js";
import { ExtensionSettingsCache } from "./storage/settingsCache.js";
import { ExtensionImePreferences } from "./storage/imePreferences.js";
import { ExtensionUserModelStore, USER_LEARNING_KEY } from "./storage/userModelStore.js";

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

  void app.hydrateSettingsFromCache().catch(() => {});
  void app.hydrateImePreferences().catch(() => {});
  void userModelStore
    .load()
    .then((data) => userModel.hydrate(data))
    .catch(() => {});

  // Reflect edits made in the options page (remove a learned rejection, etc.)
  // in the live engine immediately, without waiting for a service-worker restart.
  chromeApi.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }
    const change = changes[USER_LEARNING_KEY];
    if (change) {
      userModel.replace((change.newValue as UserLearningData | undefined) ?? emptyLearningData());
    }
  });

  // Upgrade to the Hunspell validator once its bundled dictionary loads. Until
  // then the frequency list alone drives corrections.
  // Upgrade the engine once the bundled data loads: Hunspell validator, the full
  // n-gram context corpus, and the real frequency dictionary. The dictionary is
  // applied last (its larger SymSpell index is the one costly rebuild); the small
  // built-in dictionary handles the most common typos until then.
  const url = (path: string) => chromeApi.runtime.getURL(path);
  void loadEnglishValidator(url)
    .then(({ validator, repRules }) => {
      app.setValidator(validator);
      app.setRepRules(repRules);
    })
    .catch(() => {});
  void loadEnglishContext(url)
    .then((context) => app.setContext(context))
    .catch(() => {});
  void loadEnglishDictionary(url)
    .then((dictionary) => app.setDictionary(dictionary))
    .catch(() => {});
}

/**
 * Swallow transient ChromeOS platform rejections. When the MV3 service worker is
 * starting or restarting (e.g. right after the extension is reloaded), input.ime
 * and storage calls can reject with platform errors like "No SW" (no service
 * worker) or "Context is not active". They are benign — the operation simply
 * targeted a worker/context that was momentarily gone — and must not surface as
 * uncaught-in-promise errors. Anything else is left to surface normally.
 */
const BENIGN_PLATFORM_REJECTION = /No SW|not active|inactive|No window|no longer active/i;

function installPlatformRejectionGuard(): void {
  const globalScope = globalThis as unknown as {
    addEventListener?: (
      type: "unhandledrejection",
      listener: (event: { reason?: unknown; preventDefault: () => void }) => void,
    ) => void;
  };
  globalScope.addEventListener?.("unhandledrejection", (event) => {
    const reason = event.reason as { message?: string } | string | undefined;
    const message = typeof reason === "string" ? reason : (reason?.message ?? "");
    if (BENIGN_PLATFORM_REJECTION.test(message)) {
      event.preventDefault();
    }
  });
}

if (typeof chrome !== "undefined" && chrome.runtime?.id) {
  installPlatformRejectionGuard();
  bootstrapExtension(chrome);
}
