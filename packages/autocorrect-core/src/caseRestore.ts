export type CaseShape = "lower" | "capitalized" | "upper" | "shift-capital" | "mixed";

/**
 * Classify a token's capitalisation so corrections can preserve intent:
 *   "the"   -> lower          (plain word)
 *   "The"   -> capitalized    (sentence-start capital)
 *   "THE"   -> upper          (all caps)
 *   "tHe"   -> shift-capital  (one stray capital on the 2nd/3rd letter: an
 *                              accidental Shift reaching for the word start)
 *   "tHEy"  -> mixed          (any other internal-capital pattern)
 *
 * `mixed` reads as intentional (proper nouns, code-ish tokens) and is left
 * uncorrected; `shift-capital` is corrected and rendered as a capitalised word.
 */
export function classifyCase(word: string): CaseShape {
  if (!/[a-zA-Z]/.test(word)) {
    return "lower";
  }
  const lower = word.toLowerCase();
  const upper = word.toUpperCase();
  if (word === upper && word !== lower) {
    return "upper";
  }
  if (word === lower) {
    return "lower";
  }
  const firstChar = word[0] ?? "";
  const firstIsUpper = firstChar !== firstChar.toLowerCase();
  if (firstIsUpper && word.slice(1) === word.slice(1).toLowerCase()) {
    return "capitalized";
  }
  const upperPositions: number[] = [];
  for (let i = 0; i < word.length; i++) {
    const c = word[i]!;
    if (c >= "A" && c <= "Z") {
      upperPositions.push(i);
    }
  }
  if (
    !firstIsUpper &&
    upperPositions.length === 1 &&
    (upperPositions[0] === 1 || upperPositions[0] === 2)
  ) {
    return "shift-capital";
  }
  return "mixed";
}

/** True for mixed-case tokens that should be left untouched (not corrected). */
export function isUncorrectableCase(word: string): boolean {
  return classifyCase(word) === "mixed";
}

/**
 * Apply the original token's case shape to a (lowercase) candidate so a
 * correction does not silently drop the user's capitalisation.
 *   "teh"  -> "the"     (plain lowercase)
 *   "Teh"  -> "The"     (sentence-start capital)
 *   "TEH"  -> "THE"     (all caps)
 *   "tEh"  -> "The"     (accidental Shift on an early letter -> capitalised)
 */
export function restoreCase(original: string, candidate: string): string {
  switch (classifyCase(original)) {
    case "upper":
      return candidate.toUpperCase();
    case "capitalized":
    case "shift-capital":
      return candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
    default:
      return candidate;
  }
}
