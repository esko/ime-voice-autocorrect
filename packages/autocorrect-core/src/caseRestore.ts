function isCapitalized(word: string): boolean {
  return (
    word.length > 0 &&
    word[0] === word[0]?.toUpperCase() &&
    word.slice(1) === word.slice(1).toLowerCase()
  );
}

/**
 * Apply the original token's case shape to a (lowercase) candidate so a
 * correction does not silently drop the user's capitalisation.
 *   "Teh"  -> "The"     (sentence-start capital)
 *   "TEH"  -> "THE"     (all caps)
 *   "teh"  -> "the"     (plain lowercase)
 */
export function restoreCase(original: string, candidate: string): string {
  if (original.length === 0) return candidate;
  const isAllUpper = original === original.toUpperCase() && original !== original.toLowerCase();
  if (isAllUpper) {
    return candidate.toUpperCase();
  }
  if (isCapitalized(original)) {
    return candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
  }
  return candidate;
}
