/**
 * Confusion sets: groups of real words commonly swapped for one another
 * (form/from, their/there, …). Both words are valid, so SymSpell + Hunspell
 * never flag them — only context (and user learning) can. Real-word swaps are
 * always suggest-only, even after the user has accepted a specific swap.
 */
export interface ConfusionSets {
  /** Other words commonly confused with `word`. */
  alternatives(word: string): string[];
}

export function createConfusionSets(
  sets: readonly (readonly string[])[],
): ConfusionSets {
  const map = new Map<string, string[]>();
  for (const set of sets) {
    for (const word of set) {
      const key = word.toLowerCase();
      const others = set
        .map((other) => other.toLowerCase())
        .filter((other) => other !== key);
      map.set(key, [...(map.get(key) ?? []), ...others]);
    }
  }
  return {
    alternatives: (word) => map.get(word.toLowerCase()) ?? [],
  };
}

// Curated, length-safe, high-value sets. Grow over time.
const COMMON_CONFUSIONS: readonly (readonly string[])[] = [
  ["form", "from"],
  ["their", "there", "they're"],
  ["your", "you're"],
  ["were", "we're", "where"],
  ["then", "than"],
  ["lose", "loose"],
  ["quiet", "quite"],
  ["affect", "effect"],
  ["accept", "except"],
  ["advice", "advise"],
  ["principal", "principle"],
  ["weather", "whether"],
  ["passed", "past"],
  ["hear", "here"],
  ["peace", "piece"],
];

export function createCommonConfusionSets(): ConfusionSets {
  return createConfusionSets(COMMON_CONFUSIONS);
}
