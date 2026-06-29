import { emptyLearningData, type UserLearningData } from "@input-assist/autocorrect-core";

/**
 * Pure helpers for the learned-corrections options page. Kept free of DOM and
 * chrome APIs so they can be unit-tested; options.ts wires them to storage + UI.
 */

/** The "→" used in learning.ts pairKey (original→replacement). */
const PAIR_SEPARATOR = "→";

export interface LearnedPair {
  /** Storage key, e.g. "teh→the". */
  key: string;
  original: string;
  replacement: string;
  count: number;
}

export interface LearnedWord {
  word: string;
  count: number;
}

function parsePair(key: string, count: number): LearnedPair {
  const separator = key.indexOf(PAIR_SEPARATOR);
  if (separator < 0) {
    return { key, original: key, replacement: "", count };
  }
  return {
    key,
    original: key.slice(0, separator),
    replacement: key.slice(separator + PAIR_SEPARATOR.length),
    count,
  };
}

function listPairs(table: Record<string, number>): LearnedPair[] {
  return Object.entries(table)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => parsePair(key, count))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function listWords(table: Record<string, number>): LearnedWord[] {
  return Object.entries(table)
    .filter(([, count]) => count > 0)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => a.word.localeCompare(b.word));
}

/** Coerce an unknown stored value into a well-formed UserLearningData. */
export function normalizeLearningData(value: unknown): UserLearningData {
  const base = emptyLearningData();
  if (!value || typeof value !== "object") {
    return base;
  }
  const record = value as Partial<Record<keyof UserLearningData, unknown>>;
  const counts = (input: unknown): Record<string, number> => {
    const out: Record<string, number> = {};
    if (input && typeof input === "object") {
      for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
        const count = Number(raw);
        if (Number.isFinite(count) && count > 0) {
          out[key] = count;
        }
      }
    }
    return out;
  };
  return {
    acceptedCorrections: counts(record.acceptedCorrections),
    rejectedCorrections: counts(record.rejectedCorrections),
    acceptedWords: counts(record.acceptedWords),
  };
}

export interface LearnedView {
  rejected: LearnedPair[];
  accepted: LearnedPair[];
  words: LearnedWord[];
  isEmpty: boolean;
}

/** A sorted, display-ready view of the learned data. */
export function toView(data: UserLearningData): LearnedView {
  const rejected = listPairs(data.rejectedCorrections);
  const accepted = listPairs(data.acceptedCorrections);
  const words = listWords(data.acceptedWords);
  return { rejected, accepted, words, isEmpty: !rejected.length && !accepted.length && !words.length };
}

function withoutKey(table: Record<string, number>, key: string): Record<string, number> {
  const next = { ...table };
  delete next[key];
  return next;
}

export type LearnedCategory = "rejected" | "accepted" | "words";

/** Return a copy of `data` with one entry removed from the given category. */
export function removeEntry(
  data: UserLearningData,
  category: LearnedCategory,
  key: string,
): UserLearningData {
  switch (category) {
    case "rejected":
      return { ...data, rejectedCorrections: withoutKey(data.rejectedCorrections, key) };
    case "accepted":
      return { ...data, acceptedCorrections: withoutKey(data.acceptedCorrections, key) };
    case "words":
      return { ...data, acceptedWords: withoutKey(data.acceptedWords, key) };
  }
}
