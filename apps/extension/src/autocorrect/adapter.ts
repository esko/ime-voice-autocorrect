import {
  createAutocorrectEngine,
  createTestDictionary,
  extractLastWord,
  isWordBoundary,
  type AutocorrectEngine,
  type CorrectionResult,
} from "@input-assist/autocorrect-core";

export interface ImeTextAdapter {
  deleteSurroundingText(contextId: number, length: number): Promise<void>;
  commitText(contextId: number, text: string): Promise<void>;
}

export class AutocorrectImeAdapter {
  private readonly engine: AutocorrectEngine;
  private lastCorrection: CorrectionResult | null = null;

  constructor(
    private readonly textAdapter: ImeTextAdapter,
    engine: AutocorrectEngine = createAutocorrectEngine({ dictionary: createTestDictionary() }),
  ) {
    this.engine = engine;
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

    const { corrected, undo } = this.lastCorrection;
    await this.textAdapter.deleteSurroundingText(contextId, undo.deleteLength);
    await this.textAdapter.commitText(contextId, undo.restore);
    this.lastCorrection = null;
    return true;
  }
}
