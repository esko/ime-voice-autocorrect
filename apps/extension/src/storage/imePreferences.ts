export interface ImePreferences {
  autocorrectEnabled: boolean;
}

export const DEFAULT_IME_PREFERENCES: ImePreferences = {
  autocorrectEnabled: true,
};

export interface PreferencesStorage {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

const CACHE_KEY = "imePreferences";

export class ExtensionImePreferences {
  constructor(private readonly storage: PreferencesStorage) {}

  async load(): Promise<ImePreferences> {
    const result = await this.storage.get([CACHE_KEY]);
    const value = result[CACHE_KEY];
    return value ? ({ ...DEFAULT_IME_PREFERENCES, ...(value as ImePreferences) }) : DEFAULT_IME_PREFERENCES;
  }

  async save(preferences: ImePreferences): Promise<void> {
    await this.storage.set({ [CACHE_KEY]: preferences });
  }
}
