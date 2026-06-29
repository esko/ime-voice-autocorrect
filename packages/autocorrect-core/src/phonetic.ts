import { doubleMetaphone } from "double-metaphone";
import type { DictionaryEntry } from "./dictionary.js";

export interface PhoneticCandidates {
  /** Dictionary words sharing a Double Metaphone code with `token`. */
  candidates(token: string): string[];
}

const MAX_CANDIDATES = 8;

function codesFor(word: string): string[] {
  return [...new Set(doubleMetaphone(word.toLowerCase()).filter(Boolean))];
}

/** Build the phonetic lookup once alongside the main dictionary index. */
export function createPhoneticCandidates(
  entries: readonly DictionaryEntry[],
): PhoneticCandidates {
  const byCode = new Map<string, DictionaryEntry[]>();
  for (const entry of entries) {
    for (const code of codesFor(entry.word)) {
      const bucket = byCode.get(code) ?? [];
      bucket.push(entry);
      byCode.set(code, bucket);
    }
  }
  for (const bucket of byCode.values()) {
    bucket.sort((a, b) => b.frequency - a.frequency);
  }

  return {
    candidates(token) {
      const normalized = token.toLowerCase();
      if (normalized.length < 4 || !/^[a-z]+$/.test(normalized)) {
        return [];
      }
      const matches = new Map<string, number>();
      for (const code of codesFor(normalized)) {
        for (const entry of byCode.get(code) ?? []) {
          if (entry.word !== normalized) {
            matches.set(entry.word, Math.max(matches.get(entry.word) ?? 0, entry.frequency));
          }
        }
      }
      return [...matches]
        .sort(([, leftFrequency], [, rightFrequency]) => rightFrequency - leftFrequency)
        .slice(0, MAX_CANDIDATES)
        .map(([word]) => word);
    },
  };
}
