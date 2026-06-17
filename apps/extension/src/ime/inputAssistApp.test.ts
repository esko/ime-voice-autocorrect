import { describe, expect, it, vi } from "vitest";
import { createInputAssistApp } from "./inputAssistApp.js";
import { ExtensionSettingsCache } from "../storage/settingsCache.js";

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

  it("applies cached shared settings to autocorrect on startup", async () => {
    const memory: Record<string, unknown> = {
      sharedSettings: {
        personalDictionary: ["teh"],
        ignoreList: [],
        technicalDictionary: [],
      },
    };
    const cache = new ExtensionSettingsCache({
      get: async (keys) =>
        Object.fromEntries(keys.map((key) => [key, memory[key] ?? null])),
      set: async (items) => {
        Object.assign(memory, items);
      },
    });
    const commits: string[] = [];
    const app = createInputAssistApp({
      allowedOrigin: "isolated-app://abc",
      launchRecorder: async () => {},
      settingsCache: cache,
      imeAdapter: {
        hasValidContext: () => true,
        getContextType: () => "text",
        getContextId: () => 1,
        commitText: async (text) => {
          commits.push(text);
          return true;
        },
        deleteSurroundingText: async () => true,
      },
    });

    await app.hydrateSettingsFromCache();
    app.onFocus("input-assist-us", { contextID: 1, type: "text" } as chrome.input.ime.InputContext);
    for (const key of ["t", "e", "h", " "]) {
      await app.onCharacterTyped(1, key);
    }

    expect(commits).toEqual([]);
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
