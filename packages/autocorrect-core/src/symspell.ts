import type { DictionaryEntry } from "./dictionary.js";
import { damerauLevenshtein as editDistance } from "./editDistance.js";
import {
  areKeyboardNeighbors,
  keyboardNeighbors,
  keyboardNeighborScore,
} from "./keyboardNeighbors.js";
import { isPlausibleThreeEditCandidate } from "./weightedDistance.js";

export interface SymSpellOptions {
  maxEditDistance: number;
}

export interface SymSpellCandidate {
  term: string;
  editDistance: number;
  frequency: number;
  source: "main" | "personal" | "technical";
}

function getDeletes(word: string, maxEditDistance: number): Set<string> {
  const deletes = new Set<string>([word]);
  let currentLevel = new Set<string>([word]);

  for (let i = 0; i < maxEditDistance; i++) {
    const nextLevel = new Set<string>();
    for (const w of currentLevel) {
      for (let j = 0; j < w.length; j++) {
        const del = w.slice(0, j) + w.slice(j + 1);
        deletes.add(del);
        nextLevel.add(del);
      }
    }
    currentLevel = nextLevel;
  }
  return deletes;
}

export class SymSpellIndex {
  private readonly deletionIndex = new Map<string, Set<string>>();
  private readonly exactMap = new Map<string, SymSpellCandidate>();
  private readonly maxEditDistance: number;

  private constructor(options: SymSpellOptions) {
    this.maxEditDistance = options.maxEditDistance;
  }

  static build(
    entries: readonly DictionaryEntry[],
    options: SymSpellOptions
  ): SymSpellIndex {
    const index = new SymSpellIndex(options);
    for (const entry of entries) {
      index.addEntry(entry, "main");
    }
    return index;
  }

  private addEntry(
    entry: DictionaryEntry,
    source: SymSpellCandidate["source"]
  ): void {
    const term = entry.word;
    const existing = this.exactMap.get(term);
    
    if (!existing || existing.frequency < entry.frequency) {
      this.exactMap.set(term, {
        term,
        editDistance: 0,
        frequency: entry.frequency,
        source,
      });
    }

    const deletes = getDeletes(term, this.maxEditDistance);
    for (const del of deletes) {
      const bucket = this.deletionIndex.get(del) ?? new Set<string>();
      bucket.add(term);
      this.deletionIndex.set(del, bucket);
    }
  }

  withPersonalEntries(entries: readonly DictionaryEntry[]): SymSpellIndex {
    const cloned = new SymSpellIndex({ maxEditDistance: this.maxEditDistance });
    
    for (const [del, set] of this.deletionIndex.entries()) {
      cloned.deletionIndex.set(del, new Set(set));
    }
    for (const [term, candidate] of this.exactMap.entries()) {
      cloned.exactMap.set(term, candidate);
    }

    for (const entry of entries) {
      cloned.addEntry(entry, "personal");
    }

    return cloned;
  }

  hasExact(token: string): boolean {
    return this.exactMap.has(token);
  }

  /** Frequency of a known word, or 0 if it is not in the dictionary. */
  frequencyOf(token: string): number {
    return this.exactMap.get(token)?.frequency ?? 0;
  }

  private collectCandidateTerms(token: string, target: Set<string>): void {
    for (const del of getDeletes(token, this.maxEditDistance)) {
      const bucket = this.deletionIndex.get(del);
      if (bucket) {
        for (const term of bucket) {
          target.add(term);
        }
      }
    }
  }

  lookup(token: string): SymSpellCandidate[] {
    if (this.hasExact(token)) {
      return [];
    }

    const candidateTerms = new Set<string>();
    this.collectCandidateTerms(token, candidateTerms);

    // One cheap keyboard substitution can bring a raw-distance-3 typo within
    // reach of the existing distance-2 deletion index. This avoids tripling the
    // precomputed index while still finding long, all-plausible motor slips.
    if (this.maxEditDistance === 2 && token.length >= 6) {
      for (let index = 0; index < token.length; index++) {
        for (const neighbor of keyboardNeighbors(token[index] ?? "")) {
          const variant = token.slice(0, index) + neighbor + token.slice(index + 1);
          this.collectCandidateTerms(variant, candidateTerms);
        }
      }
      for (let index = 0; index < token.length - 1; index++) {
        const variant =
          token.slice(0, index) +
          token[index + 1] +
          token[index] +
          token.slice(index + 2);
        this.collectCandidateTerms(variant, candidateTerms);
      }
      for (let index = 0; index < token.length; index++) {
        const current = token[index];
        const previous = token[index - 1];
        const next = token[index + 1];
        if (
          current !== undefined &&
          (current === previous ||
            current === next ||
            (previous !== undefined && areKeyboardNeighbors(current, previous)) ||
            (next !== undefined && areKeyboardNeighbors(current, next)))
        ) {
          this.collectCandidateTerms(
            token.slice(0, index) + token.slice(index + 1),
            candidateTerms,
          );
        }
      }
      for (let index = 0; index < token.length; index++) {
        const current = token[index];
        if (current !== undefined) {
          this.collectCandidateTerms(
            token.slice(0, index) + current + token.slice(index),
            candidateTerms,
          );
        }
      }
    }

    const candidates: SymSpellCandidate[] = [];

    for (const term of candidateTerms) {
      const dist = editDistance(token, term);
      if (
        dist <= this.maxEditDistance ||
        (dist === 3 && isPlausibleThreeEditCandidate(token, term))
      ) {
        const exact = this.exactMap.get(term);
        if (exact) {
          candidates.push({ ...exact, editDistance: dist });
        }
      }
    }

    return candidates.sort((a, b) => {
      // First sort by edit distance
      if (a.editDistance !== b.editDistance) {
        return a.editDistance - b.editDistance;
      }
      // Then sort by frequency
      const freqDelta = b.frequency - a.frequency;
      if (freqDelta !== 0) {
        return freqDelta;
      }
      // Then sort by keyboard neighbors
      return (
        keyboardNeighborScore(token, b.term) -
        keyboardNeighborScore(token, a.term)
      );
    });
  }
}
