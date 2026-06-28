import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapExtension } from "./bootstrap.js";

type FocusListener = (context: chrome.input.ime.InputContext) => void;
type KeyListener = (
  engineId: string,
  keyData: chrome.input.ime.KeyEvent,
) => Promise<boolean> | boolean;

/**
 * Regression test for the bootstrap IME wiring.
 *
 * `bootstrapExtension` must NOT supply its own imeAdapter: it has to let
 * `registerInputAssist` build the production adapter bound to the live
 * InputStateManager. A previous version passed a hand-rolled adapter whose
 * context getter was hardcoded to `null`, so the autocorrect commit path
 * (gated on `imeAdapter.getContextId() === contextId`) silently dropped every
 * correction. This test drives focus + typing through the real bootstrap path
 * and asserts the correction actually reaches `chrome.input.ime`.
 */
describe("bootstrapExtension IME wiring", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("delivers an autocorrect correction to the focused context", async () => {
    const commitText = vi.fn(
      (_params: { contextID: number; text: string }, callback?: (success: boolean) => void) =>
        callback?.(true),
    );
    const deleteSurroundingText = vi.fn(
      (_params: unknown, callback?: () => void) => callback?.(),
    );

    let focusListener: FocusListener | null = null;
    let keyListener: KeyListener | null = null;

    const storage = {
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => {}),
    };

    const chromeApi = {
      input: {
        ime: {
          onActivate: { addListener: vi.fn() },
          onDeactivated: { addListener: vi.fn() },
          onFocus: {
            addListener: (listener: FocusListener) => {
              focusListener = listener;
            },
          },
          onBlur: { addListener: vi.fn() },
          onSurroundingTextChanged: { addListener: vi.fn() },
          onMenuItemActivated: { addListener: vi.fn() },
          onCandidateClicked: { addListener: vi.fn() },
          onAssistiveWindowButtonClicked: { addListener: vi.fn() },
          onKeyEvent: {
            addListener: (listener: KeyListener) => {
              keyListener = listener;
            },
          },
          commitText,
          deleteSurroundingText,
          setMenuItems: vi.fn(),
          setAssistiveWindowProperties: vi.fn(),
        },
      },
      storage: { local: storage },
      runtime: { id: "ext-test", onConnectExternal: { addListener: vi.fn() } },
      tabs: { create: vi.fn(async () => {}) },
    } as never;

    bootstrapExtension(chromeApi);

    expect(focusListener).not.toBeNull();
    expect(keyListener).not.toBeNull();

    // A field gains focus: the InputStateManager now has a valid context.
    focusListener!({ contextID: 1, type: "text" } as chrome.input.ime.InputContext);

    // Type a misspelling followed by a word boundary to trigger autocorrect.
    for (const key of ["t", "e", "h", " "]) {
      await keyListener!("input-assist-us", {
        key,
        type: "keydown",
      } as chrome.input.ime.KeyEvent);
    }

    // With the broken null-context adapter these are never reached.
    expect(deleteSurroundingText).toHaveBeenCalled();
    expect(commitText).toHaveBeenCalledWith(
      { contextID: 1, text: "the" },
      expect.any(Function),
    );
  });
});
