import { describe, it, expect, beforeEach } from "vitest";
import { InputStateManager } from "./inputStateManager.js";

describe("InputStateManager", () => {
  let manager: InputStateManager;

  beforeEach(() => {
    manager = new InputStateManager();
  });

  const createContext = (
    contextID: number,
    type: chrome.input.ime.InputContextType = "text"
  ): chrome.input.ime.InputContext => ({
    contextID,
    type,
    spellCheck: false,
    shouldDoLearning: false,
    autoCorrect: false,
    autoComplete: false,
  });

  it("blur clears active context and all context-bound buffers", () => {
    manager.onFocus(createContext(1));
    manager.noteCommittedText("hello");
    expect(manager.getActiveContextId()).toBe(1);
    expect(manager.getPreviousToken()?.text).toBe("hello");

    manager.onBlur(1);
    expect(manager.getActiveContextId()).toBe(null);
    expect(manager.getPreviousToken()).toBe(null);
  });

  it("context ID mismatch blocks commit/replacement", () => {
    manager.onFocus(createContext(1));
    expect(manager.hasValidContext(1)).toBe(true);
    expect(manager.hasValidContext(2)).toBe(false);
  });

  it("Backspace updates the current word buffer", () => {
    manager.onFocus(createContext(1));
    manager.noteCommittedText("hello");
    expect(manager.getPreviousToken()?.text).toBe("hello");

    manager.onKeyEvent({ key: "Backspace", type: "keydown" });
    expect(manager.getPreviousToken()?.text).toBe("hell");
  });

  it("Backspace immediately after correction restores original", () => {
    manager.onFocus(createContext(1));
    manager.noteCommittedText("teh");
    manager.noteReplacement("teh", "the");
    expect(manager.getPreviousToken()?.text).toBe("the");

    const undo = manager.consumeCorrectionUndo();
    expect(undo).not.toBeNull();
    expect(undo?.original).toBe("teh");
    expect(undo?.replacement).toBe("the");
  });

  it("arrow keys invalidate current word/correction state", () => {
    manager.onFocus(createContext(1));
    manager.noteCommittedText("hello");
    manager.noteReplacement("teh", "the");

    manager.onKeyEvent({ key: "ArrowLeft", type: "keydown" });
    
    expect(manager.getPreviousToken()?.text).toBe("");
    expect(manager.consumeCorrectionUndo()).toBeNull();
  });

  it("surrounding text update refreshes token state", () => {
    manager.onFocus(createContext(1));
    manager.onSurroundingTextChanged(1, { text: "world ", focus: 6, anchor: 6 });
    
    // Wait, the surrounding text might end with a space, meaning current token is empty
    expect(manager.getPreviousToken()?.text).toBe("");
    
    manager.onSurroundingTextChanged(1, { text: "hello", focus: 5, anchor: 5 });
    expect(manager.getPreviousToken()?.text).toBe("hello");
  });

  it("password fields disable autocorrect and dictation", () => {
    manager.onFocus(createContext(1, "password"));
    expect(manager.canAutocorrect()).toBe(false);
    expect(manager.canDictate()).toBe(false);
  });

  it("URL/email/number fields disable or heavily restrict autocorrect", () => {
    manager.onFocus(createContext(1, "url"));
    expect(manager.canAutocorrect()).toBe(false);
    expect(manager.canDictate()).toBe(true);

    manager.onFocus(createContext(2, "email"));
    expect(manager.canAutocorrect()).toBe(false);
    expect(manager.canDictate()).toBe(false);
  });

  it("unrelated typing clears stale undo state", () => {
    manager.onFocus(createContext(1));
    manager.noteReplacement("teh", "the");
    
    manager.noteCommittedText(" ");
    expect(manager.consumeCorrectionUndo()).toBeNull();
  });

  it("dictation cannot commit after blur", () => {
    manager.onFocus(createContext(1));
    expect(manager.hasValidContext(1)).toBe(true);
    
    manager.onBlur(1);
    expect(manager.hasValidContext(1)).toBe(false);
  });
});
