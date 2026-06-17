import type { SharedSettings } from "@input-assist/protocol";

export interface SettingsCacheStorage {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

const CACHE_KEY = "sharedSettings";

export class ExtensionSettingsCache {
  constructor(private readonly storage: SettingsCacheStorage) {}

  async load(): Promise<SharedSettings | null> {
    const result = await this.storage.get([CACHE_KEY]);
    const value = result[CACHE_KEY];
    return value ? (value as SharedSettings) : null;
  }

  async save(settings: SharedSettings): Promise<void> {
    await this.storage.set({ [CACHE_KEY]: settings });
  }
}
