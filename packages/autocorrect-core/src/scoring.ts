import { keyboardNeighborScore } from "./keyboardNeighbors.js";

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

/** Prefer small edits; punish anything past distance 2 (or 1 for short words). */
export function editDistanceScore(editDistance: number, wordLength: number): number {
  if (editDistance === 0) return 2.0;
  if (editDistance === 1) return 1.5;
  if (editDistance === 2 && wordLength >= 5) return 0.7;
  return -2.0;
}

/** Length-aware cap on how far an automatic replacement may reach. */
export function maxEditDistanceForLength(length: number): number {
  if (length <= 2) return 0; // never autocorrect 1–2 char tokens
  if (length <= 4) return 1;
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

function countSubstitutions(a: string, b: string): number {
  let n = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) n++;
  }
  return n;
}

/**
 * Reward typos that match how a keyboard is physically mistyped: adjacent
 * transpositions, neighbouring-key substitutions, and single dropped/added keys.
 */
export function keyboardTypoScore(original: string, candidate: string): number {
  const a = original.toLowerCase();
  const b = candidate.toLowerCase();
  if (a === b) return 0;
  if (isAdjacentTransposition(a, b)) return 1.2;
  if (a.length === b.length) {
    const neighbourSubs = keyboardNeighborScore(a, b);
    const subs = countSubstitutions(a, b);
    return neighbourSubs * 1.0 - (subs - neighbourSubs) * 0.5;
  }
  // A single dropped or doubled key is a plausible typo.
  if (Math.abs(a.length - b.length) === 1) return 0.6;
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
