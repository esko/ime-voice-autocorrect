import type { Dictionary } from "./dictionary.js";
import type { UserModel } from "./learning.js";
import type { Validator } from "./validator.js";
import type { ContextModel } from "./context.js";
import type { ConfusionSets } from "./confusion.js";
import type { HardCorrections } from "./hardCorrections.js";
import { decideCorrection, type CorrectionDecision } from "./decision.js";
import { SymSpellIndex } from "./symspell.js";

/** Per-call context for a decision (e.g. preceding words for reranking). */
export interface DecideContext {
  previousWords?: readonly string[];
}

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
  decide(token: string, context?: DecideContext): CorrectionDecision;
  /** Convenience wrapper for the auto-replace path only. */
  correctToken(token: string): CorrectionResult;
}

export interface AutocorrectEngineOptions {
  dictionary: Dictionary;
  personalDictionary?: readonly string[];
  ignoreList?: readonly string[];
  userModel?: UserModel;
  validator?: Validator;
  context?: ContextModel;
  confusion?: ConfusionSets;
  hardCorrections?: HardCorrections;
}

export function createAutocorrectEngine(
  options: AutocorrectEngineOptions,
): AutocorrectEngine {
  const {
    dictionary,
    personalDictionary = [],
    ignoreList = [],
    userModel,
    validator,
    context,
    confusion,
    hardCorrections,
  } = options;

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

  const baseOptions = {
    ignored,
    model: userModel,
    validator,
    context,
    confusion,
    hardCorrections,
  };

  return {
    decide(token, decideContext) {
      return decideCorrection(token, index, {
        ...baseOptions,
        previousWords: decideContext?.previousWords,
      });
    },
    correctToken(token) {
      const decision = decideCorrection(token, index, baseOptions);
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
