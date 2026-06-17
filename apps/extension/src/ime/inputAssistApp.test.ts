import { describe, expect, it, vi } from "vitest";
import { createInputAssistApp } from "./inputAssistApp.js";
import { ExtensionSettingsCache } from "../storage/settingsCache.js";
import { ExtensionImePreferences } from "../storage/imePreferences.js";

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

  it("restores ime menu toggles from persisted preferences", async () => {
    const memory: Record<string, unknown> = {
      imePreferences: { autocorrectEnabled: false, dictationEnabled: false },
    };
    const preferences = new ExtensionImePreferences({
      get: async (keys) =>
        Object.fromEntries(keys.map((key) => [key, memory[key] ?? null])),
      set: async (items) => {
        Object.assign(memory, items);
      },
    });
    const setMenuItems = vi.fn();
    const app = createInputAssistApp({
      allowedOrigin: "isolated-app://abc",
      launchRecorder: async () => {},
      imePreferences: preferences,
      imeUi: {
        setMenuItems,
        setAssistiveWindowProperties: () => {},
      },
      imeAdapter: {
        hasValidContext: () => true,
        getContextType: () => "text",
        getContextId: () => 1,
        commitText: async () => true,
        deleteSurroundingText: async () => true,
      },
    });

    await app.hydrateImePreferences();

    expect(app.autocorrect.isEnabled()).toBe(false);
    expect(app.dictation.isDictationEnabled()).toBe(false);
    expect(setMenuItems).toHaveBeenCalled();
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
