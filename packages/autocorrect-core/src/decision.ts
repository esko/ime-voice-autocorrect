import type { SymSpellIndex } from "./symspell.js";
import type { UserModel } from "./learning.js";
import type { Validator } from "./validator.js";
import { shouldIgnoreToken } from "./ignoreRules.js";
import { restoreCase } from "./caseRestore.js";
import {
  maxEditDistanceForLength,
  scoreCandidate,
  scoreOriginal,
  type RankedCandidate,
} from "./scoring.js";

export type CorrectionDecision =
  | { action: "none" }
  | { action: "suggest"; candidates: RankedCandidate[] }
  | {
      action: "replace";
      original: string;
      replacement: string;
      confidence: number;
      candidates: RankedCandidate[];
    };

export const AUTO_REPLACE_THRESHOLD = 0.85;
export const SUGGEST_THRESHOLD = 0.55;
export const MIN_MARGIN_OVER_ORIGINAL = 1.5;
export const MIN_MARGIN_OVER_SECOND = 0.8;

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Confidence is a margin, not an absolute score: how much better the best
 * candidate is than BOTH the original word and the second-best candidate.
 */
export function confidence(
  bestScore: number,
  originalScore: number,
  secondScore: number,
): number {
  const margin = Math.min(bestScore - originalScore, bestScore - secondScore);
  return sigmoid(margin - 1.2);
}

export interface DecideOptions {
  /** Tokens the user has told us never to correct. */
  ignored?: ReadonlySet<string>;
  /** Per-user learned preferences (accepted/rejected corrections, kept words). */
  model?: UserModel;
  /** Spell-validity oracle (Hunspell/nspell) for original protection + filtering. */
  validator?: Validator;
}

/**
 * Decide what to do with a typed token: replace it, offer candidates, or leave
 * it alone. Conservative by design — a bad autocorrect is worse than none.
 */
export function decideCorrection(
  token: string,
  index: SymSpellIndex,
  options: DecideOptions = {},
): CorrectionDecision {
  if (token.length <= 2) {
    return { action: "none" };
  }

  // Candidate generation is case-insensitive; the original token's case is kept
  // for case detection (scoring) and restoration on replacement.
  const normalized = token.toLowerCase();

  // Words the user has accepted are theirs — never touch them, like the ignore
  // list and code/url tokens.
  if (
    options.ignored?.has(token) ||
    shouldIgnoreToken(token) ||
    (options.model?.isAcceptedWord(normalized) ?? false)
  ) {
    return { action: "none" };
  }

  // Valid means the exact word is known in the frequency list or the validator
  // (Hunspell) recognises it. Valid originals are real words: never auto-replace
  // them (only offer alternatives).
  const originalIsValid =
    index.hasExact(normalized) || (options.validator?.isValid(normalized) ?? false);

  const cap = maxEditDistanceForLength(token.length);
  const ranked: RankedCandidate[] = index
    .lookup(normalized)
    .filter((candidate) => candidate.editDistance <= cap)
    .filter((candidate) => options.validator?.isValid(candidate.term) ?? true)
    .map((candidate) => ({
      term: candidate.term,
      editDistance: candidate.editDistance,
      frequency: candidate.frequency,
      totalScore:
        scoreCandidate(token, candidate) + (options.model?.score(token, candidate.term) ?? 0),
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  const best = ranked[0];
  if (!best) {
    return { action: "none" };
  }
  const second = ranked[1];

  const originalScore = scoreOriginal(originalIsValid, 0);
  const secondScore = second?.totalScore ?? Number.NEGATIVE_INFINITY;
  const conf = confidence(best.totalScore, originalScore, secondScore);
  const marginOverOriginal = best.totalScore - originalScore;
  const marginOverSecond = best.totalScore - secondScore;

  // A correction the user has previously undone, or a token that is itself a
  // real word, is offered but never auto-applied.
  const rejected = options.model?.wasRejected(token, best.term) ?? false;
  const blockReplace = rejected || originalIsValid;

  if (
    !blockReplace &&
    conf >= AUTO_REPLACE_THRESHOLD &&
    marginOverOriginal >= MIN_MARGIN_OVER_ORIGINAL &&
    marginOverSecond >= MIN_MARGIN_OVER_SECOND
  ) {
    return {
      action: "replace",
      original: token,
      replacement: restoreCase(token, best.term),
      confidence: conf,
      candidates: ranked.slice(0, 5),
    };
  }

  if (conf >= SUGGEST_THRESHOLD) {
    return { action: "suggest", candidates: ranked.slice(0, 5) };
  }

  return { action: "none" };
}
