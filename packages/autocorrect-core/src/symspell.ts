import type { Dictionary, DictionaryEntry } from "./dictionary.js";
import { keyboardNeighborScore } from "./keyboardNeighbors.js";

function edits1(word: string): string[] {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const results: string[] = [];

  for (let i = 0; i <= word.length; i++) {
    const left = word.slice(0, i);
    const right = word.slice(i);

    if (i < word.length) {
      results.push(left + right.slice(1));
      for (const letter of alphabet) {
        results.push(left + letter + right.slice(1));
      }
    }

    results.push(left + right.slice(1));

    for (const letter of alphabet) {
      results.push(left + letter + right);
    }
  }

  return [...new Set(results)];
}

function edits2(word: string): string[] {
  const firstPass = edits1(word);
  const secondPass = firstPass.flatMap((entry) => edits1(entry));
  return [...new Set([...firstPass, ...secondPass])];
}

function buildDeletionIndex(dictionary: Dictionary): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();

  for (const entry of dictionary.entries) {
    const variants =
      dictionary.maxEditDistance >= 2 ? edits2(entry.word) : edits1(entry.word);

    for (const variant of variants) {
      const bucket = index.get(variant) ?? new Set<string>();
      bucket.add(entry.word);
      index.set(variant, bucket);
    }
  }

  return index;
}

export function findCandidates(
  token: string,
  dictionary: Dictionary,
): DictionaryEntry[] {
  if (dictionary.entries.some((entry) => entry.word === token)) {
    return [];
  }

  const index = buildDeletionIndex(dictionary);
  const candidates = index.get(token);
  if (!candidates || candidates.size === 0) {
    return [];
  }

  return [...candidates]
    .map((word) => dictionary.entries.find((entry) => entry.word === word))
    .filter((entry): entry is DictionaryEntry => entry !== undefined)
    .sort((a, b) => {
      const frequencyDelta = b.frequency - a.frequency;
      if (frequencyDelta !== 0) {
        return frequencyDelta;
      }
      return (
        keyboardNeighborScore(token, b.word) - keyboardNeighborScore(token, a.word)
      );
    });
}

export function findBestCandidate(token: string, dictionary: Dictionary): string | null {
  return findCandidates(token, dictionary)[0]?.word ?? null;
}
