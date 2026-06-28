import { describe, expect, it, vi } from "vitest";
import { InputStateManager } from "./ime/inputStateManager.js";
import { KeyRouter } from "./ime/keyRouter.js";
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

describe("KeyRouter", () => {
  it("routes right alt hold and release to dictation handlers", () => {
    const onDictationDown = vi.fn();
    const onDictationUp = vi.fn();
    const router = new KeyRouter({ onDictationDown, onDictationUp });

    expect(router.route("AltRight", "keydown")).toBe("dictation");
    expect(router.route("AltRight", "keyup")).toBe("dictation");
    expect(onDictationDown).toHaveBeenCalledOnce();
    expect(onDictationUp).toHaveBeenCalledOnce();
  });
});

describe("registerInputAssist backspace undo", () => {
  it("consumes backspace when autocorrect undo applies", async () => {
    const commitText = vi.fn((_parameters, callback) => callback?.(true));
    const deleteSurroundingText = vi.fn((_parameters, callback) => callback?.());
    let keyListener:
      | ((engineId: string, keyData: chrome.input.ime.KeyEvent) => Promise<boolean>)
      | null = null;

    const chromeApi = {
      input: {
        ime: {
          onActivate: { addListener: vi.fn() },
          onFocus: {
            addListener: (listener: (context: chrome.input.ime.InputContext) => void) => {
              listener({ contextID: 1, type: "text" } as chrome.input.ime.InputContext);
            },
          },
          onBlur: { addListener: vi.fn() },
          onSurroundingTextChanged: { addListener: vi.fn() },
          onMenuItemActivated: { addListener: vi.fn() },
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

    registerInputAssist(chromeApi, {
      allowedOrigin: "isolated-app://abc",
      launchRecorder: async () => {},
    });

    expect(keyListener).not.toBeNull();
    for (const key of ["t", "e", "h", " "]) {
      await keyListener?.("input-assist-us", {
        key,
        type: "keydown",
      } as chrome.input.ime.KeyEvent);
    }

    const passThrough = await keyListener?.("input-assist-us", {
      key: "Backspace",
      type: "keydown",
    } as chrome.input.ime.KeyEvent);

    expect(passThrough).toBe(false);
    expect(deleteSurroundingText).toHaveBeenCalled();
  });
});
