import type { RecorderSettings } from "./store.js";
import type { SettingsStore } from "./store.js";

export interface SettingsFormElements {
  apiKey: HTMLInputElement;
  noiseGate: HTMLInputElement;
  showPartial: HTMLInputElement;
  activationMode: HTMLSelectElement;
  saveStatus: HTMLElement;
}

export function readSettingsFromForm(elements: SettingsFormElements): RecorderSettings {
  return {
    activationMode: elements.activationMode.value as RecorderSettings["activationMode"],
    spokenPunctuation: true,
    appendSpace: false,
    showPartialTranscript: elements.showPartial.checked,
    elevenLabsApiKey: elements.apiKey.value.trim(),
    elevenLabsNoiseGate: elements.noiseGate.checked,
    elevenLabsInputDeviceId: "",
  };
}

export function writeSettingsToForm(
  settings: RecorderSettings,
  elements: SettingsFormElements,
): void {
  elements.apiKey.value = settings.elevenLabsApiKey;
  elements.noiseGate.checked = settings.elevenLabsNoiseGate;
  elements.showPartial.checked = settings.showPartialTranscript;
  elements.activationMode.value = settings.activationMode;
}

export function mountSettingsPage(
  store: SettingsStore,
  form: HTMLFormElement,
  elements: SettingsFormElements,
): void {
  writeSettingsToForm(store.load(), elements);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    store.save(readSettingsFromForm(elements));
    elements.saveStatus.textContent = "Saved";
  });
}
