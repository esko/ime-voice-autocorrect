import {
  createAutocorrectEngine,
  createCoreEnglishDictionary,
  extractLastWord,
  isWordBoundary,
  type AutocorrectEngine,
  type CorrectionResult,
  type Dictionary,
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
  enabled?: boolean;
  onCorrectionApplied?: (contextId: number, original: string, corrected: string) => void;
  onCorrectionUndone?: (contextId: number) => void;
}

export class AutocorrectImeAdapter {
  private engine: AutocorrectEngine;
  private lastCorrection: CorrectionResult | null = null;
  private readonly dictionary: Dictionary;
  private enabled: boolean;
  private readonly onCorrectionApplied?: AutocorrectImeAdapterOptions["onCorrectionApplied"];
  private readonly onCorrectionUndone?: AutocorrectImeAdapterOptions["onCorrectionUndone"];

  constructor(
    private readonly textAdapter: ImeTextAdapter,
    options: AutocorrectImeAdapterOptions = {},
  ) {
    this.dictionary = options.dictionary ?? createCoreEnglishDictionary();
    this.enabled = options.enabled ?? true;
    this.onCorrectionApplied = options.onCorrectionApplied;
    this.onCorrectionUndone = options.onCorrectionUndone;
    this.engine = createAutocorrectEngine({
      dictionary: this.dictionary,
      personalDictionary: options.personalDictionary ?? [],
      ignoreList: options.ignoreList ?? [],
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.lastCorrection = null;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  updateWordLists(lists: AutocorrectWordLists): void {
    const personalDictionary = [
      ...(lists.personalDictionary ?? []),
      ...(lists.technicalDictionary ?? []),
    ];
    this.engine = createAutocorrectEngine({
      dictionary: this.dictionary,
      personalDictionary,
      ignoreList: lists.ignoreList ?? [],
    });
  }

  async onCharacterTyped(contextId: number, textBeforeCursor: string, character: string): Promise<void> {
    if (!this.enabled || !isWordBoundary(character)) {
      return;
    }

    const token = extractLastWord(textBeforeCursor);
    if (!token) {
      return;
    }

    const result = this.engine.correctToken(token);
    if (result.kind !== "corrected") {
      this.lastCorrection = null;
      return;
    }

    await this.textAdapter.deleteSurroundingText(contextId, token.length);
    await this.textAdapter.commitText(contextId, result.corrected);
    this.lastCorrection = result;
    this.onCorrectionApplied?.(contextId, result.original, result.corrected);
  }

  async undoLastCorrection(contextId: number): Promise<boolean> {
    if (this.lastCorrection?.kind !== "corrected") {
      return false;
    }

    const { undo } = this.lastCorrection;
    await this.textAdapter.deleteSurroundingText(contextId, undo.deleteLength);
    await this.textAdapter.commitText(contextId, undo.restore);
    this.lastCorrection = null;
    this.onCorrectionUndone?.(contextId);
    return true;
  }

  async onBackspace(contextId: number): Promise<boolean> {
    return this.undoLastCorrection(contextId);
  }
}
