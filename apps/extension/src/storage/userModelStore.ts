import { emptyLearningData, type UserLearningData } from "@input-assist/autocorrect-core";

export interface UserModelStorage {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

/** chrome.storage.local key holding the persisted UserLearningData. */
export const USER_LEARNING_KEY = "userLearning";
const CACHE_KEY = USER_LEARNING_KEY;

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
