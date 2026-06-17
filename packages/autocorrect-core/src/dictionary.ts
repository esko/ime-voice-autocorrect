export interface DictionaryEntry {
  word: string;
  frequency: number;
}

export interface Dictionary {
  entries: readonly DictionaryEntry[];
  maxEditDistance: number;
}

export function createTestDictionary(
  overrides: Partial<Dictionary> = {},
): Dictionary {
  return {
    maxEditDistance: 2,
    entries: [
      { word: "the", frequency: 10_000 },
      { word: "then", frequency: 500 },
      { word: "tea", frequency: 100 },
      { word: "receive", frequency: 800 },
      { word: "chrome", frequency: 200 },
    ],
    ...overrides,
  };
}
