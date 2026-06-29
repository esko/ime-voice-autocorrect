import {
  createAutocorrectEngine,
  createCommonConfusionSets,
  createCommonContext,
  createCommonHardCorrections,
  createCoreEnglishDictionary,
  extractLastWord,
  isWordBoundary,
  type AutocorrectEngine,
  type ConfusionSets,
  type ContextModel,
  type CorrectionDecision,
  type Dictionary,
  type HardCorrections,
  type RepRules,
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
  confusion?: ConfusionSets;
  hardCorrections?: HardCorrections;
  repRules?: RepRules;
  enabled?: boolean;
  onCorrectionApplied?: (contextId: number, original: string, corrected: string) => void;
  onCorrectionUndone?: (contextId: number) => void;
}

export class AutocorrectImeAdapter {
  private engine: AutocorrectEngine;
  private dictionary: Dictionary;
  private readonly userModel?: UserModel;
  private validator?: Validator;
  private context: ContextModel;
  private readonly confusion: ConfusionSets;
  private readonly hardCorrections: HardCorrections;
  private repRules?: RepRules;
  private personalDictionary: readonly string[];
  private ignoreList: readonly string[];
  private enabled: boolean;
  private readonly onCorrectionApplied?: AutocorrectImeAdapterOptions["onCorrectionApplied"];
  private readonly onCorrectionUndone?: AutocorrectImeAdapterOptions["onCorrectionUndone"];

  constructor(
    private readonly textAdapter: ImeTextAdapter,
    options: AutocorrectImeAdapterOptions = {},
  ) {
    this.dictionary = options.dictionary ?? createCoreEnglishDictionary();
    this.userModel = options.userModel;
    this.validator = options.validator;
    this.context = options.context ?? createCommonContext();
    this.confusion = options.confusion ?? createCommonConfusionSets();
    this.hardCorrections = options.hardCorrections ?? createCommonHardCorrections();
    this.repRules = options.repRules;
    this.personalDictionary = options.personalDictionary ?? [];
    this.ignoreList = options.ignoreList ?? [];
    this.enabled = options.enabled ?? true;
    this.onCorrectionApplied = options.onCorrectionApplied;
    this.onCorrectionUndone = options.onCorrectionUndone;
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
      confusion: this.confusion,
      hardCorrections: this.hardCorrections,
      repRules: this.repRules,
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

  /** Add the mined Hunspell REP rules as an extra candidate source. */
  setRepRules(repRules: RepRules): void {
    this.repRules = repRules;
    this.engine = this.buildEngine();
  }

  /** Upgrade the context model (e.g. once the bundled n-gram corpus loads). */
  setContext(context: ContextModel): void {
    this.context = context;
    this.engine = this.buildEngine();
  }

  /** Upgrade the frequency dictionary (e.g. once the bundled list loads). */
  setDictionary(dictionary: Dictionary): void {
    this.dictionary = dictionary;
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

  /**
   * Synchronously decide what to do with the token that ends at `character` (a
   * word boundary). Returns `null` when autocorrect is off, the character is not
   * a boundary, or there is no token — i.e. nothing to do. The decision is
   * computed without touching the document so the caller can choose, in the key
   * handler, whether to consume the boundary key (see `commitReplacement`).
   */
  evaluate(
    textBeforeCursor: string,
    character: string,
    previousWords: readonly string[] = [],
    nextWord?: string,
  ): { token: string; decision: CorrectionDecision } | null {
    if (!this.enabled || !isWordBoundary(character)) {
      return null;
    }
    const token = extractLastWord(textBeforeCursor);
    if (!token) {
      return null;
    }
    return { token, decision: this.engine.decide(token, { previousWords, nextWord }) };
  }

  /**
   * Apply an auto-replacement. The boundary key is consumed by the caller and
   * re-emitted here as part of the commit (`replacement + delimiter`) so the
   * delimiter the user typed is never lost — the previous pass-through approach
   * raced the platform's own insertion and swallowed the space.
   */
  async commitReplacement(
    contextId: number,
    token: string,
    replacement: string,
    delimiter: string,
  ): Promise<void> {
    await this.textAdapter.deleteSurroundingText(contextId, token.length);
    await this.textAdapter.commitText(contextId, replacement + delimiter);
    this.onCorrectionApplied?.(contextId, token, replacement);
  }

  async undoCorrection(contextId: number, undo: { restore: string; deleteLength: number }): Promise<void> {
    await this.textAdapter.deleteSurroundingText(contextId, undo.deleteLength);
    await this.textAdapter.commitText(contextId, undo.restore);
    this.onCorrectionUndone?.(contextId);
  }
}
