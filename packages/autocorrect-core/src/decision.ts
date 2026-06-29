import type { SymSpellIndex } from "./symspell.js";
import type { UserModel } from "./learning.js";
import type { Validator } from "./validator.js";
import type { ContextModel } from "./context.js";
import type { ConfusionSets } from "./confusion.js";
import type { HardCorrections } from "./hardCorrections.js";
import type { RepRules } from "./repRules.js";
import { damerauLevenshtein } from "./editDistance.js";
import { shouldIgnoreToken } from "./ignoreRules.js";
import { restoreCase, isUncorrectableCase } from "./caseRestore.js";
import { isPlausibleThreeEditCandidate } from "./weightedDistance.js";
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
/** Max edit distance for a validator suggestion used as a coverage fallback. */
const FALLBACK_MAX_EDIT = 3;

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
  /** N-gram language model for context reranking. */
  context?: ContextModel;
  /** Words typed before this token (most recent last), for context scoring. */
  previousWords?: readonly string[];
  /** Real-word confusion sets (form/from, their/there, …). */
  confusion?: ConfusionSets;
  /** Curated common-misspelling map applied with high confidence. */
  hardCorrections?: HardCorrections;
  /** Hunspell REP rules mined as an extra (phonetic/spelling) candidate source. */
  repRules?: RepRules;
}

/**
 * Minimum context advantage for a confused alternative to be offered. Kept high
 * on purpose: the seed/bigram context is noisy, and a confusion suggestion that
 * pops up while the user is typing a perfectly correct word ("their", "were") is
 * intrusive. Only a clear contextual mismatch should surface an alternative.
 */
const CONFUSION_MIN_ADVANTAGE = 1.2;

/**
 * Real-word correction: when the original is itself a valid word, a curated
 * confusion alternative that context clearly prefers is *suggested* — never
 * silently auto-applied. Replacing a word the user spelled correctly is the
 * worst failure mode, so even a learned/accepted swap stays a suggestion; the
 * user keeps the final say via the candidate window.
 */
function confusionDecision(
  normalized: string,
  options: DecideOptions,
): CorrectionDecision | null {
  const confusion = options.confusion;
  if (!confusion) {
    return null;
  }
  const alternatives = confusion.alternatives(normalized);
  if (alternatives.length === 0) {
    return null;
  }

  const previousWords = options.previousWords ?? [];
  const originalContext = options.context?.score(previousWords, normalized) ?? 0;

  const ranked = alternatives
    .map((alt) => {
      const advantage = (options.context?.score(previousWords, alt) ?? 0) - originalContext;
      const learning = options.model?.score(normalized, alt) ?? 0;
      return { term: alt, advantage, totalScore: advantage + learning };
    })
    .filter((entry) => entry.advantage >= CONFUSION_MIN_ADVANTAGE)
    .sort((a, b) => b.totalScore - a.totalScore);

  if (ranked.length === 0) {
    return null;
  }

  const candidates: RankedCandidate[] = ranked.map((entry) => ({
    term: entry.term,
    editDistance: 0,
    frequency: 0,
    totalScore: entry.totalScore,
  }));

  return { action: "suggest", candidates };
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

  // A stray internal capital that does not read as an accidental Shift on an
  // early letter (e.g. "tHEy", "McX") looks intentional — leave it untouched.
  if (isUncorrectableCase(token)) {
    return { action: "none" };
  }

  // A real word (known in the frequency list or recognised by the validator) is
  // never "corrected" as a typo. Its only correction path is a context-supported
  // confusion-set swap.
  const originalIsValid =
    index.hasExact(normalized) || (options.validator?.isValid(normalized) ?? false);
  if (originalIsValid) {
    return confusionDecision(normalized, options) ?? { action: "none" };
  }

  // Curated common misspellings are corrected with high confidence, unless the
  // user has undone this exact correction before.
  const hard = options.hardCorrections?.correctionFor(normalized);
  if (hard && hard !== normalized && !(options.model?.wasRejected(token, hard) ?? false)) {
    return {
      action: "replace",
      original: token,
      replacement: restoreCase(token, hard),
      confidence: 1,
      candidates: [{ term: hard, editDistance: damerauLevenshtein(normalized, hard), frequency: 0, totalScore: 0 }],
    };
  }

  const cap = maxEditDistanceForLength(token.length);
  const previousWords = options.previousWords ?? [];
  const scoreFor = (candidate: {
    term: string;
    editDistance: number;
    frequency: number;
  }): number =>
    scoreCandidate(token, candidate) +
    (options.model?.score(token, candidate.term) ?? 0) +
    (options.context?.score(previousWords, candidate.term) ?? 0);

  const ranked: RankedCandidate[] = index
    .lookup(normalized)
    .filter(
      (candidate) =>
        candidate.editDistance <= cap ||
        (candidate.editDistance === 3 &&
          isPlausibleThreeEditCandidate(normalized, candidate.term)),
    )
    .filter((candidate) => options.validator?.isValid(candidate.term) ?? true)
    .map((candidate) => ({
      term: candidate.term,
      editDistance: candidate.editDistance,
      frequency: candidate.frequency,
      totalScore: scoreFor(candidate),
    }));

  // Coverage fallback: when SymSpell + the frequency list find nothing, widen the
  // net with two extra sources scored the same way (so keyboard/context ranking
  // still applies) — the validator's (Hunspell) own suggestions, and candidates
  // from the mined REP rules for phonetic/spelling slips SymSpell cannot reach.
  if (ranked.length === 0) {
    const seen = new Set<string>();
    const consider = (raw: string): void => {
      const term = raw.toLowerCase();
      if (term === normalized || seen.has(term)) {
        return;
      }
      // The candidate must be a real word; REP output in particular is unchecked.
      if (!(options.validator?.isValid(term) ?? index.hasExact(term))) {
        return;
      }
      const distance = damerauLevenshtein(normalized, term);
      if (distance === 0 || distance > FALLBACK_MAX_EDIT) {
        return;
      }
      seen.add(term);
      const candidate = { term, editDistance: distance, frequency: index.frequencyOf(term) };
      ranked.push({ ...candidate, totalScore: scoreFor(candidate) });
    };

    for (const suggestion of options.validator?.suggest?.(normalized).slice(0, 5) ?? []) {
      consider(suggestion);
    }
    for (const candidate of options.repRules?.candidates(normalized) ?? []) {
      consider(candidate);
    }
  }

  ranked.sort((a, b) => b.totalScore - a.totalScore);

  const best = ranked[0];
  if (!best) {
    return { action: "none" };
  }
  const second = ranked[1];

  // The original is not a real word here (valid originals returned above), so its
  // baseline score is zero.
  const originalScore = scoreOriginal(false, 0);
  const secondScore = second?.totalScore ?? Number.NEGATIVE_INFINITY;
  const conf = confidence(best.totalScore, originalScore, secondScore);
  const marginOverOriginal = best.totalScore - originalScore;
  const marginOverSecond = best.totalScore - secondScore;

  // A correction the user has previously undone is offered but never auto-applied.
  const rejected = options.model?.wasRejected(token, best.term) ?? false;

  if (
    !rejected &&
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
