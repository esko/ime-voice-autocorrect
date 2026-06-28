export interface KeyboardEventLike {
  key: string;
  type: "keydown" | "keyup";
}

export type InputStateAction = { type: "pass_through" } | { type: "undo_correction" };

export interface TokenSnapshot {
  text: string;
}

export interface CorrectionUndo {
  original: string;
  replacement: string;
}

export class InputStateManager {
  private activeContext: chrome.input.ime.InputContext | null = null;
  private currentBuffer: string = "";
  private previousWord: string = "";
  private correctionUndo: CorrectionUndo | null = null;

  onFocus(context: chrome.input.ime.InputContext): void {
    this.activeContext = context;
    this.currentBuffer = "";
    this.previousWord = "";
    this.correctionUndo = null;
  }

  onBlur(contextId: number): void {
    if (this.activeContext?.contextID === contextId) {
      this.activeContext = null;
      this.currentBuffer = "";
      this.previousWord = "";
      this.correctionUndo = null;
    }
  }

  onSurroundingTextChanged(
    contextId: number,
    info: chrome.input.ime.SurroundingTextInfo,
  ): void {
    if (this.activeContext?.contextID !== contextId) {
      return;
    }
    const textBeforeCursor = info.text.slice(0, info.focus);
    const lastWordMatch = textBeforeCursor.match(/(\S+)$/);
    this.currentBuffer = lastWordMatch?.[1] ?? "";
    // The word before the current token, used for context (bigram) scoring.
    const words = textBeforeCursor.split(/\s+/).filter(Boolean);
    this.previousWord = (lastWordMatch ? words[words.length - 2] : words[words.length - 1]) ?? "";
  }

  getPreviousWord(): string {
    return this.previousWord;
  }

  onKeyEvent(event: KeyboardEventLike): InputStateAction[] {
    if (event.type !== "keydown") {
      return [{ type: "pass_through" }];
    }

    if (event.key === "Backspace") {
      if (this.currentBuffer.length > 0) {
        this.currentBuffer = this.currentBuffer.slice(0, -1);
      }
      return [{ type: "pass_through" }];
    }

    if (
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight" ||
      event.key === "ArrowUp" ||
      event.key === "ArrowDown"
    ) {
      this.currentBuffer = "";
      this.correctionUndo = null;
      return [{ type: "pass_through" }];
    }

    return [{ type: "pass_through" }];
  }

  getActiveContextId(): number | null {
    return this.activeContext?.contextID ?? null;
  }

  getActiveContext(): chrome.input.ime.InputContext | null {
    return this.activeContext;
  }

  canAutocorrect(): boolean {
    if (!this.activeContext) {
      return false;
    }
    const type = this.activeContext.type;
    return type !== "password" && type !== "url" && type !== "email" && type !== "number";
  }

  getPreviousToken(): TokenSnapshot | null {
    if (this.activeContext === null) {
      return null;
    }
    return { text: this.currentBuffer };
  }

  noteCommittedText(text: string): void {
    if (!this.activeContext) return;
    
    // Unrelated typing clears stale undo state (e.g. typing a space)
    if (text === " ") {
      this.currentBuffer = "";
      this.correctionUndo = null;
    } else {
      this.currentBuffer += text;
    }
  }

  noteReplacement(original: string, replacement: string): void {
    if (!this.activeContext) return;
    
    this.correctionUndo = { original, replacement };
    this.currentBuffer = replacement;
  }

  consumeCorrectionUndo(): CorrectionUndo | null {
    const undo = this.correctionUndo;
    this.correctionUndo = null;
    return undo;
  }

  clearCorrectionUndo(): void {
    this.correctionUndo = null;
  }
}
