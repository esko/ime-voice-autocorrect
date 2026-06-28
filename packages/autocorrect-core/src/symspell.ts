import type { DictionaryEntry } from "./dictionary.js";
import { keyboardNeighborScore } from "./keyboardNeighbors.js";

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

// Compute standard Damerau-Levenshtein distance.
// The matrix is stored as a single flat array indexed `row * width + col`,
// which avoids per-row allocations and the type-unsafe nested indexing.
function editDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const height = a.length + 1;
  const width = b.length + 1;
  const matrix = new Uint32Array(height * width);
  const at = (i: number, j: number): number => matrix[i * width + j]!;
  const set = (i: number, j: number, value: number): void => {
    matrix[i * width + j] = value;
  };

  for (let i = 0; i <= a.length; i++) set(i, 0, i);
  for (let j = 0; j <= b.length; j++) set(0, j, j);

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let minCost = Math.min(
        at(i - 1, j) + 1, // deletion
        at(i, j - 1) + 1, // insertion
        at(i - 1, j - 1) + cost // substitution
      );

      // Transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        minCost = Math.min(minCost, at(i - 2, j - 2) + cost);
      }

      set(i, j, minCost);
    }
  }

  return at(a.length, b.length);
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

  lookup(token: string): SymSpellCandidate[] {
    if (this.hasExact(token)) {
      return [];
    }

    const tokenDeletes = getDeletes(token, this.maxEditDistance);
    const candidateTerms = new Set<string>();

    for (const del of tokenDeletes) {
      const bucket = this.deletionIndex.get(del);
      if (bucket) {
        for (const term of bucket) {
          candidateTerms.add(term);
        }
      }
    }

    const candidates: SymSpellCandidate[] = [];

    for (const term of candidateTerms) {
      const dist = editDistance(token, term);
      if (dist <= this.maxEditDistance) {
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
