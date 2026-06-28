import { areKeyboardNeighbors } from "./keyboardNeighbors.js";

/** A candidate that has been scored by the ranking layer. */
export interface RankedCandidate {
  term: string;
  editDistance: number;
  frequency: number;
  totalScore: number;
}

/** Minimal shape the scorer needs from a generated candidate. */
export interface ScorableCandidate {
  term: string;
  editDistance: number;
  frequency: number;
}

/** Common words win, but log-damped so "the" does not dominate everything. */
export function frequencyScore(frequency: number): number {
  return Math.log10(frequency + 1) * 1.2;
}

/**
 * Prefer small edits. Distance 2 is allowed (not punished) on words of length
 * 4+ because a single motor slip often produces two neighbouring/extra keys at
 * once; keyboard plausibility (below) is what actually gates such corrections.
 */
export function editDistanceScore(editDistance: number, wordLength: number): number {
  if (editDistance === 0) return 2.0;
  if (editDistance === 1) return 1.5;
  if (editDistance === 2 && wordLength >= 4) return 0.6;
  return -2.0;
}

/**
 * Length-aware cap on how far an automatic replacement may reach. Words of
 * length 4+ allow distance 2 so multi-key fat-finger slips remain correctable.
 */
export function maxEditDistanceForLength(length: number): number {
  if (length <= 2) return 0; // never autocorrect 1–2 char tokens
  if (length === 3) return 1;
  return 2;
}

/** A single swap of two adjacent characters, e.g. "teh" -> "the". */
function isAdjacentTransposition(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const diffs: number[] = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diffs.push(i);
    if (diffs.length > 2) return false;
  }
  if (diffs.length !== 2) return false;
  const i = diffs[0];
  const j = diffs[1];
  if (i === undefined || j === undefined) return false;
  return j === i + 1 && a[i] === b[j] && a[j] === b[i];
}

/** Index in `longer` of the first character that isn't in `shorter`. */
function extraCharIndex(longer: string, shorter: string): number {
  for (let i = 0; i < shorter.length; i++) {
    if (longer[i] !== shorter[i]) return i;
  }
  return shorter.length; // the extra character is at the end
}

// Weights are tuned for motor-difficulty typing: hitting neighbouring keys and
// pressing multiple/extra keys are treated as the most plausible mistakes.
const NEIGHBOUR_SUB = 1.5;
const FAR_SUB = -0.7;
const TRANSPOSE = 1.4;
const DOUBLED_KEY = 1.3;
const INSERTED_NEIGHBOUR = 1.2;
const PLAIN_INDEL = 0.5;

/**
 * Reward typos that match how a keyboard is physically mistyped. Emphasised for
 * motor-difficulty input: neighbouring-key substitutions, doubled keys (tremor
 * bounce), and inserted adjacent keys (fat-finger) all score highly; edits that
 * are not keyboard-plausible are penalised.
 */
export function keyboardTypoScore(original: string, candidate: string): number {
  const a = original.toLowerCase();
  const b = candidate.toLowerCase();
  if (a === b) return 0;
  if (isAdjacentTransposition(a, b)) return TRANSPOSE;

  if (a.length === b.length) {
    let score = 0;
    for (let i = 0; i < a.length; i++) {
      const from = a[i];
      const to = b[i];
      if (from === undefined || to === undefined || from === to) continue;
      score += areKeyboardNeighbors(from, to) ? NEIGHBOUR_SUB : FAR_SUB;
    }
    return score;
  }

  if (Math.abs(a.length - b.length) === 1) {
    // When the user typed an extra character, classify the insertion.
    if (a.length > b.length) {
      const i = extraCharIndex(a, b);
      const extra = a[i];
      const prev = a[i - 1];
      const next = a[i + 1];
      if (extra !== undefined && (extra === prev || extra === next)) {
        return DOUBLED_KEY; // a key bounced/held (common with tremor)
      }
      if (
        extra !== undefined &&
        ((prev !== undefined && areKeyboardNeighbors(extra, prev)) ||
          (next !== undefined && areKeyboardNeighbors(extra, next)))
      ) {
        return INSERTED_NEIGHBOUR; // brushed an adjacent key
      }
    }
    return PLAIN_INDEL;
  }
  return 0;
}

function isCapitalized(word: string): boolean {
  return (
    word.length > 0 &&
    word[0] === word[0]?.toUpperCase() &&
    word.slice(1) === word.slice(1).toLowerCase()
  );
}

/**
 * Plain lowercase typos are safe to correct; a sentence-start capital is fine;
 * internal/ALL caps look intentional (proper nouns, constants) so are penalised.
 */
export function caseShapeScore(original: string): number {
  if (original === original.toLowerCase()) return 0.3;
  if (isCapitalized(original)) return 0.1;
  return -1.0;
}

/** Weighted total used to rank candidates against each other. */
export function scoreCandidate(original: string, candidate: ScorableCandidate): number {
  return (
    frequencyScore(candidate.frequency) +
    editDistanceScore(candidate.editDistance, original.length) +
    keyboardTypoScore(original, candidate.term) +
    caseShapeScore(original)
  );
}

/**
 * The score the best candidate must beat. A valid original word is a strong
 * baseline; an unknown (likely typo) original contributes nothing.
 */
export function scoreOriginal(originalIsValid: boolean, frequency: number): number {
  return originalIsValid ? frequencyScore(frequency) + 5.0 : 0;
}
