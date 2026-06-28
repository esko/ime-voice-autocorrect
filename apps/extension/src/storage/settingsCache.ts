export interface SettingsCacheStorage {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

/** Word lists the autocorrect engine consumes, cached in chrome.storage.local. */
export interface CachedWordLists {
  personalDictionary?: readonly string[];
  technicalDictionary?: readonly string[];
  ignoreList?: readonly string[];
}

const CACHE_KEY = "wordLists";

export class ExtensionSettingsCache {
  constructor(private readonly storage: SettingsCacheStorage) {}

  async load(): Promise<CachedWordLists | null> {
    const result = await this.storage.get([CACHE_KEY]);
    const value = result[CACHE_KEY];
    return value ? (value as CachedWordLists) : null;
  }

  async save(wordLists: CachedWordLists): Promise<void> {
    await this.storage.set({ [CACHE_KEY]: wordLists });
  }
}
