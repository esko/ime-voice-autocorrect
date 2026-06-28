/**
 * Context language model for candidate reranking. Scores a candidate given the
 * words that precede it, preferring a trigram match and backing off to a bigram
 * (stupid backoff). Bounded so context disambiguates between candidates without
 * dominating the rest of the score.
 */
export interface ContextModel {
  /** Score a candidate given the preceding words (most recent last). */
  score(previousWords: readonly string[], candidate: string): number;
}

const MAX_CONTEXT_BONUS = 1.5;
const NGRAM_WEIGHT = 0.4;
const BIGRAM_BACKOFF = 0.8;

function boundedLog(count: number, weight: number): number {
  if (count <= 0) {
    return 0;
  }
  return Math.min(MAX_CONTEXT_BONUS, Math.log10(count + 1) * weight);
}

function toMap(table: Readonly<Record<string, number>>): Map<string, number> {
  return new Map(Object.entries(table).map(([key, value]) => [key.toLowerCase(), value]));
}

export function createNgramContext(tables: {
  bigrams?: Readonly<Record<string, number>>;
  trigrams?: Readonly<Record<string, number>>;
}): ContextModel {
  const bigrams = toMap(tables.bigrams ?? {});
  const trigrams = toMap(tables.trigrams ?? {});

  return {
    score(previousWords, candidate) {
      const words = previousWords.map((word) => word.toLowerCase());
      const candidateWord = candidate.toLowerCase();
      const w1 = words[words.length - 1];
      const w2 = words[words.length - 2];

      if (w2 !== undefined && w1 !== undefined) {
        const trigram = trigrams.get(`${w2} ${w1} ${candidateWord}`) ?? 0;
        if (trigram > 0) {
          return boundedLog(trigram, NGRAM_WEIGHT);
        }
      }
      if (w1 !== undefined) {
        const bigram = bigrams.get(`${w1} ${candidateWord}`) ?? 0;
        if (bigram > 0) {
          return boundedLog(bigram, NGRAM_WEIGHT) * BIGRAM_BACKOFF;
        }
      }
      return 0;
    },
  };
}

// Seed tables — enough to disambiguate the most frequent function-word
// corrections. Replace with a larger compressed corpus later (see roadmap).
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

const COMMON_TRIGRAMS: Record<string, number> = {
  "one of the": 300_000,
  "out of the": 200_000,
  "a lot of": 250_000,
  "as well as": 150_000,
  "i want to": 180_000,
  "i need to": 140_000,
  "going to be": 160_000,
  "i would like": 90_000,
  "to be the": 80_000,
  "the end of": 90_000,
};

export function createCommonContext(): ContextModel {
  return createNgramContext({ bigrams: COMMON_BIGRAMS, trigrams: COMMON_TRIGRAMS });
}
