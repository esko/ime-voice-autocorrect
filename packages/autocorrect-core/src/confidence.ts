import type { Dictionary } from "./dictionary.js";
import { findCandidates } from "./symspell.js";

export function pickCandidate(
  token: string,
  dictionary: Dictionary,
  minConfidence: number,
): string | null {
  const candidates = findCandidates(token, dictionary);
  if (candidates.length === 0) {
    return null;
  }

  const best = candidates[0];
  const second = candidates[1];
  if (!best) {
    return null;
  }

  if (!second) {
    return best.word;
  }

  const confidence = best.frequency / second.frequency;
  return confidence >= minConfidence ? best.word : null;
}
