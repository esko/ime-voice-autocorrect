import { describe, it, expect, beforeEach } from "vitest";
import { InputStateManager } from "./inputStateManager.js";

describe("InputStateManager", () => {
  let manager: InputStateManager;

  beforeEach(() => {
    manager = new InputStateManager();
  });

  const createContext = (
    contextID: number,
    type: chrome.input.ime.InputContextType = "text",
    autoCorrect = true,
  ): chrome.input.ime.InputContext => ({
    contextID,
    type,
    spellCheck: false,
    shouldDoLearning: false,
    autoCorrect,
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

  it("tracks up to two previous words for context scoring", () => {
    manager.onFocus(createContext(1));
    manager.onSurroundingTextChanged(1, { text: "i went to teh", focus: 13, anchor: 13 });
    expect(manager.getPreviousToken()?.text).toBe("teh");
    expect(manager.getPreviousWords()).toEqual(["went", "to"]);

    manager.onBlur(1);
    expect(manager.getPreviousWords()).toEqual([]);
  });

  it("tracks the next word when the caret is before existing text", () => {
    manager.onFocus(createContext(1));
    manager.onSurroundingTextChanged(1, {
      text: "i wrote teh answer",
      focus: 11,
      anchor: 11,
    });

    expect(manager.getPreviousToken()?.text).toBe("teh");
    expect(manager.getNextWord()).toBe("answer");
  });

  it("password fields disable autocorrect", () => {
    manager.onFocus(createContext(1, "password"));
    expect(manager.canAutocorrect()).toBe(false);
  });

  it("URL/email/number fields disable autocorrect", () => {
    manager.onFocus(createContext(1, "url"));
    expect(manager.canAutocorrect()).toBe(false);

    manager.onFocus(createContext(2, "email"));
    expect(manager.canAutocorrect()).toBe(false);
  });

  it("a normal text field allows autocorrect", () => {
    manager.onFocus(createContext(1, "text"));
    expect(manager.canAutocorrect()).toBe(true);
  });

  it("respects a field that opts out via autoCorrect=false (e.g. a terminal)", () => {
    manager.onFocus(createContext(1, "text", false));
    expect(manager.canAutocorrect()).toBe(false);
  });

  it("allows an opted-out field when the user explicitly enables correction", () => {
    manager.onFocus(createContext(1, "text", false));
    expect(manager.canAutocorrect(true)).toBe(true);
  });

  it("unrelated typing clears stale undo state", () => {
    manager.onFocus(createContext(1));
    manager.noteReplacement("teh", "the");
    
    manager.noteCommittedText(" ");
    expect(manager.consumeCorrectionUndo()).toBeNull();
  });
});
