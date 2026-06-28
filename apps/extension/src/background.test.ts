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
      | ((engineId: string, keyData: chrome.input.ime.KeyboardEvent) => Promise<boolean>)
      | null = null;

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

    // Normal typing must pass through (return false) so characters appear,
    // while the IME deletes + recommits on the word boundary.
    for (const key of ["t", "e", "h"]) {
      const passThrough = await keyListener?.("input-assist-us", {
        key,
        type: "keydown",
      } as chrome.input.ime.KeyboardEvent);
      expect(passThrough).toBe(false);
    }
    const spaceReturn = await keyListener?.("input-assist-us", {
      key: " ",
      type: "keydown",
    } as chrome.input.ime.KeyboardEvent);
    expect(spaceReturn).toBe(false);
    expect(deleteSurroundingText).toHaveBeenCalled();

    const consumed = await keyListener?.("input-assist-us", {
      key: "Backspace",
      type: "keydown",
    } as chrome.input.ime.KeyboardEvent);
    expect(consumed).toBe(true);
  });
});
