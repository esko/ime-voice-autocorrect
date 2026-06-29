import { areKeyboardNeighbors } from "./keyboardNeighbors.js";

/**
 * Keyboard-weighted edit distance (a noisy-channel cost), as opposed to the
 * plain integer Damerau-Levenshtein in `editDistance.ts`.
 *
 * The point is the motor-difficulty profile: when someone routinely hits
 * neighbouring keys, presses a key twice (tremor bounce), or brushes an extra
 * adjacent key, those edits are *physically plausible* and should cost far less
 * than an edit that turns the word into an unrelated one. Two adjacent-key slips
 * in a word ("word" -> "wprd") then weigh about the same as a single far
 * substitution, which is how a human reads them too.
 *
 * Standard substitutions / far indels keep their full unit cost, so the metric
 * never makes an implausible correction look cheap — it only *discounts*
 * keyboard-plausible mistakes. See [[user-motor-difficulty-typing]].
 */

// Substitution costs.
const SUB_NEIGHBOUR = 0.4; // hit a key next to the intended one
const SUB_FAR = 1.0; // hit an unrelated key

// Transposition (two adjacent characters swapped, e.g. "teh" -> "the").
const TRANSPOSE = 0.3;

// Insertion / deletion costs. "Doubled" = the extra/missing character repeats an
// adjacent one (a held or bounced key, or a dropped double letter); "neighbour"
// = the extra character sits next to an adjacent key (a brushed fat-finger key).
const INDEL_BASE = 1.0;
const INDEL_DOUBLED = 0.3;
const INDEL_NEIGHBOUR = 0.6;

/** Three adjacent-key substitutions cost 3 × 0.4. */
export const MAX_PLAUSIBLE_THREE_EDIT_COST = 1.2;
const COST_EPSILON = 1e-9;

export function isPlausibleThreeEditCost(weightedCost: number, wordLength: number): boolean {
  return wordLength >= 6 && weightedCost <= MAX_PLAUSIBLE_THREE_EDIT_COST + COST_EPSILON;
}

/** Guard the wider candidate search to long tokens with cheap motor slips. */
export function isPlausibleThreeEditCandidate(typed: string, candidate: string): boolean {
  return isPlausibleThreeEditCost(weightedKeyboardDistance(typed, candidate), typed.length);
}

function substitutionCost(a: string, b: string): number {
  if (a === b) return 0;
  return areKeyboardNeighbors(a, b) ? SUB_NEIGHBOUR : SUB_FAR;
}

/**
 * Cost of removing `removed` from the typed string, given the characters that
 * sat just before and after it (`prev`, `next`). A repeat of an adjacent key
 * (held/bounced) or a key physically adjacent to one of its neighbours (a
 * brushed fat-finger key) is a cheap motor slip; anything else is a full
 * deletion. Both sides are checked because a brushed key sits next to the key
 * it was reaching for, which may be either side.
 */
function deletionCost(
  removed: string,
  prev: string | undefined,
  next: string | undefined,
): number {
  if (removed === prev || removed === next) return INDEL_DOUBLED;
  if (
    (prev !== undefined && areKeyboardNeighbors(removed, prev)) ||
    (next !== undefined && areKeyboardNeighbors(removed, next))
  ) {
    return INDEL_NEIGHBOUR;
  }
  return INDEL_BASE;
}

/**
 * Cost of inserting `inserted` (a character the user dropped), given the
 * character typed before it (`prev`). A dropped double letter is the common
 * cheap case ("comon" -> "common"); otherwise a full insertion.
 */
function insertionCost(inserted: string, prev: string | undefined): number {
  if (prev !== undefined && inserted === prev) return INDEL_DOUBLED;
  return INDEL_BASE;
}

/**
 * Weighted Damerau-Levenshtein distance between the typed token and a candidate.
 * Lower means "this looks more like a real finger slip for this candidate".
 */
export function weightedKeyboardDistance(typed: string, candidate: string): number {
  const a = typed.toLowerCase();
  const b = candidate.toLowerCase();
  if (a === b) return 0;
  if (a.length === 0) return b.length * INDEL_BASE;
  if (b.length === 0) return a.length * INDEL_BASE;

  const height = a.length + 1;
  const width = b.length + 1;
  const matrix = new Float64Array(height * width);
  const at = (i: number, j: number): number => matrix[i * width + j]!;
  const set = (i: number, j: number, value: number): void => {
    matrix[i * width + j] = value;
  };

  set(0, 0, 0);
  for (let i = 1; i <= a.length; i++) {
    // Leading characters of the typed token are extra (deletions).
    set(i, 0, at(i - 1, 0) + deletionCost(a[i - 1]!, a[i - 2], a[i]));
  }
  for (let j = 1; j <= b.length; j++) {
    // Leading characters of the candidate are missing (insertions).
    set(0, j, at(0, j - 1) + insertionCost(b[j - 1]!, b[j - 2]));
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const subCost = substitutionCost(a[i - 1]!, b[j - 1]!);
      let best = Math.min(
        at(i - 1, j) + deletionCost(a[i - 1]!, a[i - 2], a[i]), // delete typed char
        at(i, j - 1) + insertionCost(b[j - 1]!, b[j - 2]), // insert missing char
        at(i - 1, j - 1) + subCost, // substitute
      );

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, at(i - 2, j - 2) + TRANSPOSE);
      }

      set(i, j, best);
    }
  }

  return at(a.length, b.length);
}
