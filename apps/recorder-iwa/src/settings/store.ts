export interface RecorderSettings {
  activationMode: "push-to-talk" | "toggle";
  spokenPunctuation: boolean;
  appendSpace: boolean;
  showPartialTranscript: boolean;
  elevenLabsApiKey: string;
  elevenLabsNoiseGate: boolean;
  elevenLabsInputDeviceId: string;
  personalDictionary: string[];
  ignoreList: string[];
  technicalDictionary: string[];
}

export const DEFAULT_RECORDER_SETTINGS: RecorderSettings = {
  activationMode: "push-to-talk",
  spokenPunctuation: true,
  appendSpace: false,
  showPartialTranscript: true,
  elevenLabsApiKey: "",
  elevenLabsNoiseGate: true,
  elevenLabsInputDeviceId: "",
  personalDictionary: [],
  ignoreList: [],
  technicalDictionary: [],
};

export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class SettingsStore {
  private readonly key = "input-assist.recorder.settings";

  constructor(private readonly storage: SettingsStorage) {}

  load(): RecorderSettings {
    const raw = this.storage.getItem(this.key);
    if (!raw) {
      return DEFAULT_RECORDER_SETTINGS;
    }
    return { ...DEFAULT_RECORDER_SETTINGS, ...JSON.parse(raw) } as RecorderSettings;
  }

  save(settings: RecorderSettings): void {
    this.storage.setItem(this.key, JSON.stringify(settings));
  }

  toSharedSnapshot(settings: RecorderSettings) {
    return {
      activationMode: settings.activationMode,
      spokenPunctuation: settings.spokenPunctuation,
      appendSpace: settings.appendSpace,
      showPartialTranscript: settings.showPartialTranscript,
      personalDictionary: settings.personalDictionary,
      ignoreList: settings.ignoreList,
      technicalDictionary: settings.technicalDictionary,
    };
  }
}
