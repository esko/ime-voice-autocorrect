import { formatWordList, parseWordList } from "@input-assist/autocorrect-core";
import type { RecorderSettings } from "./store.js";
import type { SettingsStore } from "./store.js";

export interface SettingsFormElements {
  apiKey: HTMLInputElement;
  noiseGate: HTMLInputElement;
  showPartial: HTMLInputElement;
  activationMode: HTMLSelectElement;
  personalDictionary: HTMLTextAreaElement;
  technicalDictionary: HTMLTextAreaElement;
  ignoreList: HTMLTextAreaElement;
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
    personalDictionary: parseWordList(elements.personalDictionary.value),
    technicalDictionary: parseWordList(elements.technicalDictionary.value),
    ignoreList: parseWordList(elements.ignoreList.value),
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
  elements.personalDictionary.value = formatWordList(settings.personalDictionary);
  elements.technicalDictionary.value = formatWordList(settings.technicalDictionary);
  elements.ignoreList.value = formatWordList(settings.ignoreList);
}

export function mountSettingsPage(
  store: SettingsStore,
  form: HTMLFormElement,
  elements: SettingsFormElements,
  options?: { onSaved?: (settings: RecorderSettings) => void },
): void {
  writeSettingsToForm(store.load(), elements);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const settings = readSettingsFromForm(elements);
    store.save(settings);
    options?.onSaved?.(settings);
    elements.saveStatus.textContent = "Saved";
  });
}
