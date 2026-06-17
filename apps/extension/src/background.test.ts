import { describe, expect, it, vi } from "vitest";
import { ContextTracker } from "./ime/contextTracker.js";
import { KeyRouter } from "./ime/keyRouter.js";
import { registerImeHandlers } from "./background.js";

describe("ContextTracker", () => {
  it("tracks focus and blur for the active context", () => {
    const tracker = new ContextTracker();
    tracker.onFocus("input-assist-us", { contextID: 1 } as chrome.input.ime.InputContext);
    expect(tracker.getActive()).toEqual({ contextId: 1, engineId: "input-assist-us" });
    tracker.onBlur(1);
    expect(tracker.getActive()).toBeNull();
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

describe("registerImeHandlers", () => {
  it("registers chrome ime listeners", () => {
    const listeners: Record<string, (...args: never[]) => unknown> = {};
    const chromeMock = {
      input: {
        ime: {
          onActivate: {
            addListener: (fn: (...args: never[]) => unknown) => (listeners.activate = fn),
          },
          onFocus: { addListener: (fn: (...args: never[]) => unknown) => (listeners.focus = fn) },
          onBlur: { addListener: (fn: (...args: never[]) => unknown) => (listeners.blur = fn) },
          onKeyEvent: {
            addListener: (fn: (...args: never[]) => unknown) => (listeners.key = fn),
          },
        },
      },
    } as unknown as typeof chrome;

    const app = registerImeHandlers(chromeMock);
    listeners.activate?.("input-assist-fi" as never);
    listeners.focus?.({ contextID: 9 } as never);
    listeners.blur?.(9 as never);

    expect(app.contexts.getActive()).toBeNull();
    expect(listeners.key).toBeTypeOf("function");
  });
});
