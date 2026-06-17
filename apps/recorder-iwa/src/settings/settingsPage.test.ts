import { describe, expect, it, vi } from "vitest";
import { DEFAULT_RECORDER_SETTINGS, SettingsStore } from "./store.js";
import { mountSettingsPage, readSettingsFromForm } from "./settingsPage.js";

describe("settingsPage", () => {
  it("persists edited settings on submit", () => {
    const memory = new Map<string, string>();
    const store = new SettingsStore({
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, value),
    });

    const form = { addEventListener: vi.fn() } as unknown as HTMLFormElement;
    const elements = {
      apiKey: { value: "sk_test" } as HTMLInputElement,
      noiseGate: { checked: false } as HTMLInputElement,
      showPartial: { checked: true } as HTMLInputElement,
      activationMode: { value: "toggle" } as HTMLSelectElement,
      personalDictionary: { value: "" } as HTMLTextAreaElement,
      ignoreList: { value: "" } as HTMLTextAreaElement,
      saveStatus: { textContent: "" } as HTMLElement,
    };

    mountSettingsPage(store, form, elements);
    const submitHandler = (form.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
      ([event]) => event === "submit",
    )?.[1] as (event: { preventDefault: () => void }) => void;

    elements.apiKey.value = "sk_test";
    elements.activationMode.value = "toggle";
    submitHandler?.({ preventDefault: vi.fn() });

    expect(store.load().elevenLabsApiKey).toBe("sk_test");
    expect(store.load().activationMode).toBe("toggle");
    expect(elements.saveStatus.textContent).toBe("Saved");
  });

  it("reads form values into settings", () => {
    const settings = readSettingsFromForm({
      apiKey: { value: "  key  " } as HTMLInputElement,
      noiseGate: { checked: true } as HTMLInputElement,
      showPartial: { checked: false } as HTMLInputElement,
      activationMode: { value: "push-to-talk" } as HTMLSelectElement,
      personalDictionary: { value: "teh, custom" } as HTMLTextAreaElement,
      ignoreList: { value: "chromr" } as HTMLTextAreaElement,
      saveStatus: { textContent: "" } as HTMLElement,
    });

    expect(settings).toEqual({
      ...DEFAULT_RECORDER_SETTINGS,
      elevenLabsApiKey: "key",
      elevenLabsNoiseGate: true,
      showPartialTranscript: false,
      personalDictionary: ["teh", "custom"],
      ignoreList: ["chromr"],
    });
  });
});
