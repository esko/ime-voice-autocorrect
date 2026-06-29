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
  private previousWords: string[] = [];
  private correctionUndo: CorrectionUndo | null = null;

  onFocus(context: chrome.input.ime.InputContext): void {
    this.activeContext = context;
    this.currentBuffer = "";
    this.previousWords = [];
    this.correctionUndo = null;
  }

  onBlur(contextId: number): void {
    if (this.activeContext?.contextID === contextId) {
      this.activeContext = null;
      this.currentBuffer = "";
      this.previousWords = [];
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
    // Up to two words before the current token (most recent last), for n-gram
    // context scoring.
    const words = textBeforeCursor.split(/\s+/).filter(Boolean);
    const beforeToken = lastWordMatch ? words.slice(0, -1) : words;
    this.previousWords = beforeToken.slice(-2);
  }

  getPreviousWords(): readonly string[] {
    return this.previousWords;
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

  canAutocorrect(correctOptedOutFields = false): boolean {
    if (!this.activeContext) {
      return false;
    }
    const type = this.activeContext.type;
    if (type === "password" || type === "url" || type === "email" || type === "number") {
      return false;
    }
    // Terminals and code editors typically opt out and may not support
    // deleteSurroundingText. Only enter that path after an explicit user opt-in;
    // the app then deletes with synthetic Backspace events instead.
    if (this.activeContext.autoCorrect === false && !correctOptedOutFields) {
      return false;
    }
    return true;
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
