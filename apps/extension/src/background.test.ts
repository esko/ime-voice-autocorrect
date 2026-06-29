import { describe, expect, it, vi } from "vitest";
import { InputStateManager } from "./ime/inputStateManager.js";
import { registerInputAssist } from "./background.js";

describe("InputStateManager basics in background", () => {
  it("tracks focus and blur for the active context", () => {
    const manager = new InputStateManager();
    manager.onFocus({ contextID: 1, type: "text" } as chrome.input.ime.InputContext);
    expect(manager.getActiveContextId()).toBe(1);
    manager.onBlur(1);
    expect(manager.getActiveContextId()).toBeNull();
  });
});

describe("registerInputAssist key handling", () => {
  it("passes normal keys through and consumes a backspace that triggers undo", async () => {
    const commitText = vi.fn((_parameters, callback) => callback?.(true));
    const deleteSurroundingText = vi.fn((_parameters, callback) => callback?.());
    let keyListener:
      | ((engineId: string, keyData: chrome.input.ime.KeyboardEvent) => boolean)
      | null = null;
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    const chromeApi = {
      input: {
        ime: {
          onActivate: { addListener: vi.fn() },
          onDeactivated: { addListener: vi.fn() },
          onFocus: {
            addListener: (listener: (context: chrome.input.ime.InputContext) => void) => {
              listener({ contextID: 1, type: "text" } as chrome.input.ime.InputContext);
            },
          },
          onBlur: { addListener: vi.fn() },
          onSurroundingTextChanged: { addListener: vi.fn() },
          onMenuItemActivated: { addListener: vi.fn() },
          onCandidateClicked: { addListener: vi.fn() },
          onAssistiveWindowButtonClicked: { addListener: vi.fn() },
          onKeyEvent: {
            addListener: (listener: typeof keyListener) => {
              keyListener = listener;
            },
          },
          commitText,
          deleteSurroundingText,
          setMenuItems: vi.fn(),
          setAssistiveWindowProperties: vi.fn(),
        },
      },
    } as never;

    registerInputAssist(chromeApi);
    expect(keyListener).not.toBeNull();

    // Normal typing must pass through (return false) so characters appear.
    for (const key of ["t", "e", "h"]) {
      const passThrough = keyListener?.("input-assist-us", {
        key,
        type: "keydown",
      } as chrome.input.ime.KeyboardEvent);
      expect(passThrough).toBe(false); // synchronous boolean, not a Promise
    }
    // The boundary key that triggers an auto-replacement is consumed (true): the
    // IME deletes the token and re-emits the replacement plus the delimiter, so
    // the space is never swallowed.
    const spaceReturn = keyListener?.("input-assist-us", {
      key: " ",
      type: "keydown",
    } as chrome.input.ime.KeyboardEvent);
    expect(spaceReturn).toBe(true);

    // The correction runs asynchronously after the synchronous return.
    await flush();
    expect(deleteSurroundingText).toHaveBeenCalled();
    expect(commitText).toHaveBeenCalledWith(
      expect.objectContaining({ text: "the " }),
      expect.any(Function),
    );

    const consumed = keyListener?.("input-assist-us", {
      key: "Backspace",
      type: "keydown",
    } as chrome.input.ime.KeyboardEvent);
    expect(consumed).toBe(true);
  });

  it("preserves capitalisation when the platform sends lowercase keys + shiftKey", async () => {
    const commitText = vi.fn((_parameters, callback) => callback?.(true));
    const deleteSurroundingText = vi.fn((_parameters, callback) => callback?.());
    let keyListener:
      | ((engineId: string, keyData: chrome.input.ime.KeyboardEvent) => boolean)
      | null = null;
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    const chromeApi = {
      input: {
        ime: {
          onActivate: { addListener: vi.fn() },
          onDeactivated: { addListener: vi.fn() },
          onFocus: {
            addListener: (listener: (context: chrome.input.ime.InputContext) => void) => {
              listener({ contextID: 1, type: "text" } as chrome.input.ime.InputContext);
            },
          },
          onBlur: { addListener: vi.fn() },
          onSurroundingTextChanged: { addListener: vi.fn() },
          onMenuItemActivated: { addListener: vi.fn() },
          onCandidateClicked: { addListener: vi.fn() },
          onAssistiveWindowButtonClicked: { addListener: vi.fn() },
          onKeyEvent: {
            addListener: (listener: typeof keyListener) => {
              keyListener = listener;
            },
          },
          commitText,
          deleteSurroundingText,
          setMenuItems: vi.fn(),
          setAssistiveWindowProperties: vi.fn(),
        },
      },
    } as never;

    registerInputAssist(chromeApi);

    // "T" arrives as key:"t" with shiftKey:true (some ChromeOS configs); the
    // handler must re-apply the capital so the correction keeps it.
    keyListener?.("input-assist-us", { key: "t", type: "keydown", shiftKey: true } as chrome.input.ime.KeyboardEvent);
    for (const key of ["e", "h", " "]) {
      keyListener?.("input-assist-us", { key, type: "keydown" } as chrome.input.ime.KeyboardEvent);
    }

    await flush();
    expect(commitText).toHaveBeenCalledWith(
      expect.objectContaining({ text: "The " }),
      expect.any(Function),
    );
  });
});
