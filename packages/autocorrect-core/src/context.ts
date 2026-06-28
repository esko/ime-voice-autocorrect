/** A previous-word → word bigram frequency lookup. */
export interface BigramModel {
  count(previousWord: string, word: string): number;
}

/**
 * Context boost: a candidate that forms a common bigram with the previous word
 * is more likely the intended one. Bounded so context disambiguates between
 * candidates without dominating the score.
 */
export function contextScore(
  previousWord: string | undefined,
  candidate: string,
  model: BigramModel | undefined,
): number {
  if (!model || !previousWord) {
    return 0;
  }
  const count = model.count(previousWord, candidate);
  if (count <= 0) {
    return 0;
  }
  return Math.min(1.5, Math.log10(count + 1) * 0.4);
}

export function createBigramModel(counts: Readonly<Record<string, number>>): BigramModel {
  const map = new Map<string, number>();
  for (const [pair, count] of Object.entries(counts)) {
    map.set(pair.toLowerCase(), count);
  }
  return {
    count: (previousWord, word) =>
      map.get(`${previousWord.toLowerCase()} ${word.toLowerCase()}`) ?? 0,
  };
}

// A small seed table of common English bigrams. Enough to disambiguate the most
// frequent function-word corrections (e.g. "in teh" -> "in the"). Grow later.
const COMMON_BIGRAMS: Record<string, number> = {
  "of the": 2_500_000,
  "in the": 2_400_000,
  "to the": 1_500_000,
  "on the": 900_000,
  "for the": 900_000,
  "and the": 700_000,
  "at the": 500_000,
  "from the": 400_000,
  "with the": 600_000,
  "to be": 800_000,
  "in a": 600_000,
  "is a": 500_000,
  "this is": 400_000,
  "i am": 300_000,
  "i have": 250_000,
  "going to": 400_000,
  "want to": 250_000,
  "need to": 200_000,
};

export function createCommonBigrams(): BigramModel {
  return createBigramModel(COMMON_BIGRAMS);
}
