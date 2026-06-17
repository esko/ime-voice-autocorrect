import { describe, expect, it, vi } from "vitest";
import { createInputAssistApp } from "./inputAssistApp.js";

describe("createInputAssistApp", () => {
  it("auto-launches recorder before dictation when bridge is disconnected", async () => {
    const launchRecorder = vi.fn(async () => {});
    const app = createInputAssistApp({
      allowedOrigin: "isolated-app://abc",
      launchRecorder,
      imeAdapter: {
        hasValidContext: () => true,
        getContextType: () => "text",
        getContextId: () => 1,
        commitText: async () => true,
        deleteSurroundingText: async () => true,
      },
      createSessionId: () => "sess-1",
    });

    app.onFocus("input-assist-us", { contextID: 1, type: "text" } as chrome.input.ime.InputContext);
    await app.dictation.onDictationChordDown();

    expect(launchRecorder).toHaveBeenCalledOnce();
  });

  it("blocks dictation in password fields", async () => {
    const launchRecorder = vi.fn(async () => {});
    const app = createInputAssistApp({
      allowedOrigin: "isolated-app://abc",
      launchRecorder,
      imeAdapter: {
        hasValidContext: () => true,
        getContextType: () => "password",
        getContextId: () => 1,
        commitText: async () => true,
        deleteSurroundingText: async () => true,
      },
    });

    app.onFocus("input-assist-us", {
      contextID: 1,
      type: "password",
    } as chrome.input.ime.InputContext);
    await app.dictation.onDictationChordDown();

    expect(launchRecorder).not.toHaveBeenCalled();
  });
});
