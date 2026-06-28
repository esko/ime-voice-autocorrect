import type { SymSpellIndex } from "./symspell.js";

export function pickCandidate(
  token: string,
  index: SymSpellIndex,
  minConfidence: number,
): string | null {
  const candidates = index.lookup(token);
  if (candidates.length === 0) {
    return null;
  }

  const best = candidates[0];
  const second = candidates[1];
  if (!best) {
    return null;
  }

  if (!second) {
    return best.term;
  }

  const confidence = best.frequency / second.frequency;
  return confidence >= minConfidence ? best.term : null;
}
