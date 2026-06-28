import {
  createAutocorrectEngine,
  createCommonContext,
  createCoreEnglishDictionary,
  extractLastWord,
  isWordBoundary,
  type AutocorrectEngine,
  type ContextModel,
  type Dictionary,
  type RankedCandidate,
  type UserModel,
  type Validator,
} from "@input-assist/autocorrect-core";

export interface ImeTextAdapter {
  deleteSurroundingText(contextId: number, length: number): Promise<void>;
  commitText(contextId: number, text: string): Promise<void>;
}

export interface AutocorrectWordLists {
  personalDictionary?: readonly string[];
  technicalDictionary?: readonly string[];
  ignoreList?: readonly string[];
}

export interface AutocorrectImeAdapterOptions {
  dictionary?: Dictionary;
  personalDictionary?: readonly string[];
  ignoreList?: readonly string[];
  userModel?: UserModel;
  validator?: Validator;
  context?: ContextModel;
  enabled?: boolean;
  onCorrectionApplied?: (contextId: number, original: string, corrected: string) => void;
  onCorrectionUndone?: (contextId: number) => void;
  onSuggest?: (
    contextId: number,
    original: string,
    delimiter: string,
    candidates: RankedCandidate[],
  ) => void;
}

export class AutocorrectImeAdapter {
  private engine: AutocorrectEngine;
  private readonly dictionary: Dictionary;
  private readonly userModel?: UserModel;
  private validator?: Validator;
  private readonly context: ContextModel;
  private personalDictionary: readonly string[];
  private ignoreList: readonly string[];
  private enabled: boolean;
  private readonly onCorrectionApplied?: AutocorrectImeAdapterOptions["onCorrectionApplied"];
  private readonly onCorrectionUndone?: AutocorrectImeAdapterOptions["onCorrectionUndone"];
  private readonly onSuggest?: AutocorrectImeAdapterOptions["onSuggest"];

  constructor(
    private readonly textAdapter: ImeTextAdapter,
    options: AutocorrectImeAdapterOptions = {},
  ) {
    this.dictionary = options.dictionary ?? createCoreEnglishDictionary();
    this.userModel = options.userModel;
    this.validator = options.validator;
    this.context = options.context ?? createCommonContext();
    this.personalDictionary = options.personalDictionary ?? [];
    this.ignoreList = options.ignoreList ?? [];
    this.enabled = options.enabled ?? true;
    this.onCorrectionApplied = options.onCorrectionApplied;
    this.onCorrectionUndone = options.onCorrectionUndone;
    this.onSuggest = options.onSuggest;
    this.engine = this.buildEngine();
  }

  private buildEngine(): AutocorrectEngine {
    return createAutocorrectEngine({
      dictionary: this.dictionary,
      personalDictionary: this.personalDictionary,
      ignoreList: this.ignoreList,
      userModel: this.userModel,
      validator: this.validator,
      context: this.context,
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Upgrade the spell validator (e.g. once the Hunspell dictionary loads). */
  setValidator(validator: Validator): void {
    this.validator = validator;
    this.engine = this.buildEngine();
  }

  updateWordLists(lists: AutocorrectWordLists): void {
    this.personalDictionary = [
      ...(lists.personalDictionary ?? []),
      ...(lists.technicalDictionary ?? []),
    ];
    this.ignoreList = lists.ignoreList ?? [];
    this.engine = this.buildEngine();
  }

  async onCharacterTyped(
    contextId: number,
    textBeforeCursor: string,
    character: string,
    previousWords: readonly string[] = [],
  ): Promise<void> {
    if (!this.enabled || !isWordBoundary(character)) {
      return;
    }

    const token = extractLastWord(textBeforeCursor);
    if (!token) {
      return;
    }

    const decision = this.engine.decide(token, { previousWords });
    if (decision.action === "replace") {
      await this.textAdapter.deleteSurroundingText(contextId, token.length);
      await this.textAdapter.commitText(contextId, decision.replacement);
      this.onCorrectionApplied?.(contextId, token, decision.replacement);
      return;
    }
    if (decision.action === "suggest") {
      this.onSuggest?.(contextId, token, character, decision.candidates);
    }
  }

  async undoCorrection(contextId: number, undo: { restore: string; deleteLength: number }): Promise<void> {
    await this.textAdapter.deleteSurroundingText(contextId, undo.deleteLength);
    await this.textAdapter.commitText(contextId, undo.restore);
    this.onCorrectionUndone?.(contextId);
  }
}
