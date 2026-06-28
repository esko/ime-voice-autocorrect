import type { Dictionary } from "./dictionary.js";
import type { UserModel } from "./learning.js";
import { decideCorrection, type CorrectionDecision } from "./decision.js";
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
  /** Full decision: replace, suggest candidates, or do nothing. */
  decide(token: string): CorrectionDecision;
  /** Convenience wrapper for the auto-replace path only. */
  correctToken(token: string): CorrectionResult;
}

export interface AutocorrectEngineOptions {
  dictionary: Dictionary;
  personalDictionary?: readonly string[];
  ignoreList?: readonly string[];
  userModel?: UserModel;
}

export function createAutocorrectEngine(
  options: AutocorrectEngineOptions,
): AutocorrectEngine {
  const { dictionary, personalDictionary = [], ignoreList = [], userModel } = options;

  let index = SymSpellIndex.build(dictionary.entries, {
    maxEditDistance: dictionary.maxEditDistance,
  });
  if (personalDictionary.length > 0) {
    const personalEntries = personalDictionary.map((word) => ({
      word,
      frequency: 100_000,
    }));
    index = index.withPersonalEntries(personalEntries);
  }

  const ignored = new Set(ignoreList);

  return {
    decide(token) {
      return decideCorrection(token, index, { ignored, model: userModel });
    },
    correctToken(token) {
      const decision = decideCorrection(token, index, { ignored, model: userModel });
      if (decision.action !== "replace") {
        return { kind: "unchanged", original: token };
      }
      return {
        kind: "corrected",
        original: token,
        corrected: decision.replacement,
        undo: { restore: token, deleteLength: decision.replacement.length },
      };
    },
  };
}
