import { SettingsStore } from "./settings/store.js";
import { mountSettingsPage } from "./settings/settingsPage.js";
import { publishSettingsSnapshot } from "./settings/publishSnapshot.js";

if (typeof document !== "undefined") {
  const form = document.getElementById("settings-form");
  const apiKey = document.getElementById("api-key");
  const noiseGate = document.getElementById("noise-gate");
  const showPartial = document.getElementById("show-partial");
  const activationMode = document.getElementById("activation-mode");
  const personalDictionary = document.getElementById("personal-dictionary");
  const technicalDictionary = document.getElementById("technical-dictionary");
  const ignoreList = document.getElementById("ignore-list");
  const saveStatus = document.getElementById("save-status");
  const extensionId = new URLSearchParams(globalThis.location?.search ?? "").get("extensionId") ?? "";

  if (
    form instanceof HTMLFormElement &&
    apiKey instanceof HTMLInputElement &&
    noiseGate instanceof HTMLInputElement &&
    showPartial instanceof HTMLInputElement &&
    activationMode instanceof HTMLSelectElement &&
    personalDictionary instanceof HTMLTextAreaElement &&
    technicalDictionary instanceof HTMLTextAreaElement &&
    ignoreList instanceof HTMLTextAreaElement &&
    saveStatus instanceof HTMLElement
  ) {
    const store = new SettingsStore(localStorage);
    const port = extensionId && typeof chrome !== "undefined" ? chrome.runtime.connect(extensionId) : null;

    mountSettingsPage(
      store,
      form,
      {
        apiKey,
        noiseGate,
        showPartial,
        activationMode,
        personalDictionary,
        technicalDictionary,
        ignoreList,
        saveStatus,
      },
      {
        onSaved: (settings) => {
          if (port) {
            publishSettingsSnapshot(store, settings, (message) => port.postMessage(message));
          }
        },
      },
    );
  }
}
