import { SettingsStore } from "./settings/store.js";
import { mountSettingsPage } from "./settings/settingsPage.js";
import { publishSettingsSnapshot } from "./settings/publishSnapshot.js";
import { mountDiagnosticsPanel } from "./diagnostics/diagnosticsPanel.js";
import { PROTOCOL_VERSION } from "@input-assist/protocol";

if (typeof document !== "undefined") {
  const form = document.getElementById("settings-form");
  const apiKey = document.getElementById("api-key");
  const noiseGate = document.getElementById("noise-gate");
  const showPartial = document.getElementById("show-partial");
  const activationMode = document.getElementById("activation-mode");
  const languageHint = document.getElementById("language-hint");
  const personalDictionary = document.getElementById("personal-dictionary");
  const technicalDictionary = document.getElementById("technical-dictionary");
  const ignoreList = document.getElementById("ignore-list");
  const saveStatus = document.getElementById("save-status");
  const bridgeStatus = document.getElementById("bridge-status");
  const copyDebugBundle = document.getElementById("copy-debug-bundle");
  const debugStatus = document.getElementById("debug-status");
  const extensionId = new URLSearchParams(globalThis.location?.search ?? "").get("extensionId") ?? "";

  if (
    form instanceof HTMLFormElement &&
    apiKey instanceof HTMLInputElement &&
    noiseGate instanceof HTMLInputElement &&
    showPartial instanceof HTMLInputElement &&
    activationMode instanceof HTMLSelectElement &&
    languageHint instanceof HTMLSelectElement &&
    personalDictionary instanceof HTMLTextAreaElement &&
    technicalDictionary instanceof HTMLTextAreaElement &&
    ignoreList instanceof HTMLTextAreaElement &&
    saveStatus instanceof HTMLElement &&
    bridgeStatus instanceof HTMLElement &&
    copyDebugBundle instanceof HTMLButtonElement &&
    debugStatus instanceof HTMLElement
  ) {
    const store = new SettingsStore(localStorage);
    const port = extensionId && typeof chrome !== "undefined" ? chrome.runtime.connect(extensionId) : null;

    if (port) {
      bridgeStatus.textContent = "Bridge: connected";
      port.onDisconnect.addListener(() => {
        bridgeStatus.textContent = "Bridge: disconnected";
      });
    } else {
      bridgeStatus.textContent = "Bridge: unavailable";
    }

    mountDiagnosticsPanel(copyDebugBundle, debugStatus, {
      getState: () => ({
        bridgeConnected: port !== null,
        protocolVersion: PROTOCOL_VERSION,
        lastAsrError: null,
        micLevel: null,
        settings: store.toSharedSnapshot(store.load()),
        apiKey: store.load().elevenLabsApiKey || undefined,
      }),
      copyText: async (text) => {
        await navigator.clipboard.writeText(text);
      },
    });

    mountSettingsPage(
      store,
      form,
      {
        apiKey,
        noiseGate,
        showPartial,
        activationMode,
        languageHint,
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
