import type { Dictionary } from "./dictionary.js";
import { pickCandidate } from "./confidence.js";
import { shouldIgnoreToken } from "./ignoreRules.js";

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

  const personal = new Set(personalDictionary);
  const ignored = new Set(ignoreList);

  return {
    correctToken(token) {
      if (
        personal.has(token) ||
        ignored.has(token) ||
        shouldIgnoreToken(token)
      ) {
        return { kind: "unchanged", original: token };
      }

      const candidate = pickCandidate(token, dictionary, minConfidence);
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
