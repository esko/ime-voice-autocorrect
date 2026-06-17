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
  ignoreList?: readonly string[];
}

export class AutocorrectImeAdapter {
  private engine: AutocorrectEngine;
  private lastCorrection: CorrectionResult | null = null;
  private readonly dictionary: Dictionary;

  constructor(
    private readonly textAdapter: ImeTextAdapter,
    options: {
      dictionary?: Dictionary;
      personalDictionary?: readonly string[];
      ignoreList?: readonly string[];
    } = {},
  ) {
    this.dictionary = options.dictionary ?? createCoreEnglishDictionary();
    this.engine = createAutocorrectEngine({
      dictionary: this.dictionary,
      personalDictionary: options.personalDictionary ?? [],
      ignoreList: options.ignoreList ?? [],
    });
  }

  updateWordLists(lists: AutocorrectWordLists): void {
    this.engine = createAutocorrectEngine({
      dictionary: this.dictionary,
      personalDictionary: lists.personalDictionary ?? [],
      ignoreList: lists.ignoreList ?? [],
    });
  }

  async onCharacterTyped(contextId: number, textBeforeCursor: string, character: string): Promise<void> {
    if (!isWordBoundary(character)) {
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
  }

  async onBackspace(contextId: number): Promise<boolean> {
    if (this.lastCorrection?.kind !== "corrected") {
      return false;
    }

    const { undo } = this.lastCorrection;
    await this.textAdapter.deleteSurroundingText(contextId, undo.deleteLength);
    await this.textAdapter.commitText(contextId, undo.restore);
    this.lastCorrection = null;
    return true;
  }
}
