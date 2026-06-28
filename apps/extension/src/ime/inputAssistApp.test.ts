import { describe, expect, it, vi } from "vitest";
import { createInputAssistApp } from "./inputAssistApp.js";
import { ExtensionSettingsCache } from "../storage/settingsCache.js";
import { ExtensionImePreferences } from "../storage/imePreferences.js";

const noopAdapter = {
  getContextId: () => 1,
  commitText: async () => true,
  deleteSurroundingText: async () => true,
};

describe("createInputAssistApp", () => {
  it("applies cached shared settings to autocorrect on startup", async () => {
    const memory: Record<string, unknown> = {
      wordLists: {
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
      settingsCache: cache,
      imeAdapter: {
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

    // "teh" is in the personal dictionary, so it is never corrected.
    expect(commits).toEqual([]);
  });

  it("restores the autocorrect toggle from persisted preferences", async () => {
    const memory: Record<string, unknown> = {
      imePreferences: { autocorrectEnabled: false },
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
      imePreferences: preferences,
      imeUi: {
        setMenuItems,
        setAssistiveWindowProperties: () => {},
      },
      imeAdapter: noopAdapter,
    });

    await app.hydrateImePreferences();
    // Menus only paint once an engine is active.
    expect(setMenuItems).not.toHaveBeenCalled();
    app.onActivate("input-assist-us");

    expect(app.autocorrect.isEnabled()).toBe(false);
    expect(setMenuItems).toHaveBeenCalled();
  });

  it("does not autocorrect in password fields", async () => {
    const commits: string[] = [];
    const app = createInputAssistApp({
      imeAdapter: {
        getContextId: () => 1,
        commitText: async (text) => {
          commits.push(text);
          return true;
        },
        deleteSurroundingText: async () => true,
      },
    });

    app.onFocus("input-assist-us", {
      contextID: 1,
      type: "password",
    } as chrome.input.ime.InputContext);
    for (const key of ["t", "e", "h", " "]) {
      await app.onCharacterTyped(1, key);
    }

    expect(commits).toEqual([]);
  });
});
