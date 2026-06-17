import { SettingsStore } from "./settings/store.js";
import { mountSettingsPage } from "./settings/settingsPage.js";
import { publishSettingsSnapshot } from "./settings/publishSnapshot.js";
import { mountDiagnosticsPanel } from "./diagnostics/diagnosticsPanel.js";
import { PROTOCOL_VERSION } from "@input-assist/protocol";
import { filterAudioInputDevices } from "./settings/audioDevices.js";
import { populateInputDeviceSelect } from "./settings/populateInputDevices.js";

if (typeof document !== "undefined") {
  const form = document.getElementById("settings-form");
  const apiKey = document.getElementById("api-key");
  const noiseGate = document.getElementById("noise-gate");
  const showPartial = document.getElementById("show-partial");
  const spokenPunctuation = document.getElementById("spoken-punctuation");
  const appendSpace = document.getElementById("append-space");
  const inputDevice = document.getElementById("input-device");
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
    spokenPunctuation instanceof HTMLInputElement &&
    appendSpace instanceof HTMLInputElement &&
    inputDevice instanceof HTMLSelectElement &&
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

    void (async () => {
      const saved = store.load();
      populateInputDeviceSelect(inputDevice, [], saved.elevenLabsInputDeviceId);
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = filterAudioInputDevices(await navigator.mediaDevices.enumerateDevices());
        populateInputDeviceSelect(inputDevice, devices, saved.elevenLabsInputDeviceId);
      }
    })();

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
        spokenPunctuation,
        appendSpace,
        inputDevice,
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
