import type { Dictionary } from "./dictionary.js";
import { pickCandidate } from "./confidence.js";
import { shouldIgnoreToken } from "./ignoreRules.js";
import { SymSpellIndex } from "./symspell.js";

export type CorrectionResult =
  | { kind: "unchanged"; original: string }
  | {
      kind: "corrected";
      original: string;
      corrected: string;
      undo: { restore: string; deleteLength: number };
    };

export interface AutocorrectEngine {
  correctToken(token: string): CorrectionResult;
}

export interface AutocorrectEngineOptions {
  dictionary: Dictionary;
  personalDictionary?: readonly string[];
  ignoreList?: readonly string[];
  minConfidence?: number;
}

export function createAutocorrectEngine(
  options: AutocorrectEngineOptions,
): AutocorrectEngine {
  const {
    dictionary,
    personalDictionary = [],
    ignoreList = [],
    minConfidence = 1.1,
  } = options;

  let index = SymSpellIndex.build(dictionary.entries, { maxEditDistance: dictionary.maxEditDistance });
  if (personalDictionary.length > 0) {
    const personalEntries = personalDictionary.map(word => ({ word, frequency: 100_000 }));
    index = index.withPersonalEntries(personalEntries);
  }

  const ignored = new Set(ignoreList);

  return {
    correctToken(token) {
      if (
        ignored.has(token) ||
        shouldIgnoreToken(token)
      ) {
        return { kind: "unchanged", original: token };
      }

      const candidate = pickCandidate(token, index, minConfidence);
      if (candidate === null || candidate === token) {
        return { kind: "unchanged", original: token };
      }

      return {
        kind: "corrected",
        original: token,
        corrected: candidate,
        undo: { restore: token, deleteLength: candidate.length },
      };
    },
  };
}
