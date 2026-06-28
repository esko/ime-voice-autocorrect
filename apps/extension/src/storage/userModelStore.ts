import { emptyLearningData, type UserLearningData } from "@input-assist/autocorrect-core";

export interface UserModelStorage {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

const CACHE_KEY = "userLearning";

/** Persists the user's learned correction preferences in chrome.storage.local. */
export class ExtensionUserModelStore {
  constructor(private readonly storage: UserModelStorage) {}

  async load(): Promise<UserLearningData> {
    const result = await this.storage.get([CACHE_KEY]);
    const value = result[CACHE_KEY];
    return value ? (value as UserLearningData) : emptyLearningData();
  }

  async save(data: UserLearningData): Promise<void> {
    await this.storage.set({ [CACHE_KEY]: data });
  }
}
