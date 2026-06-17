import type { LanguageHint } from "./createRealtimeSocket.js";

export const MAX_ASR_KEYTERMS = 100;

export function collectAsrKeyterms(
  personalDictionary: readonly string[],
  technicalDictionary: readonly string[],
): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];

  for (const term of [...personalDictionary, ...technicalDictionary]) {
    const trimmed = term.trim();
    const normalized = trimmed.toLowerCase();
    if (!trimmed || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    terms.push(trimmed);
    if (terms.length >= MAX_ASR_KEYTERMS) {
      break;
    }
  }

  return terms;
}

export function appendKeyterms(params: URLSearchParams, keyterms: readonly string[]): void {
  for (const term of keyterms) {
    params.append("keyterms", term);
  }
}
