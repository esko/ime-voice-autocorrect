import { describe, expect, it, vi } from "vitest";
import { UserModel } from "@input-assist/autocorrect-core";
import { createInputAssistApp } from "./inputAssistApp.js";
import { ExtensionSettingsCache } from "../storage/settingsCache.js";
import { ExtensionImePreferences } from "../storage/imePreferences.js";

const noopAdapter = {
  getContextId: () => 1,
  commitText: async () => true,
  deleteSurroundingText: async () => true,
};

const textContext = { contextID: 1, type: "text" } as chrome.input.ime.InputContext;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function type(
  app: { handleCharacter: (contextId: number, character: string) => boolean },
  text: string,
) {
  for (const character of text) {
    app.handleCharacter(1, character);
    // The commit/learning side-effects run asynchronously after the sync return.
    await flush();
  }
}

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
    await type(app, "teh ");

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

  it("stops auto-applying a correction after the user undoes it", async () => {
    const commits: string[] = [];
    const model = UserModel.empty();
    const persistLearning = vi.fn();
    const app = createInputAssistApp({
      userModel: model,
      persistLearning,
      imeAdapter: {
        getContextId: () => 1,
        commitText: async (text) => {
          commits.push(text);
          return true;
        },
        deleteSurroundingText: async () => true,
      },
    });
    app.onFocus("input-assist-us", textContext);

    await type(app, "teh ");
    expect(commits).toContain("the ");

    // User backspaces over the correction.
    app.recordRejection("teh", "the");
    expect(model.wasRejected("teh", "the")).toBe(true);
    expect(persistLearning).toHaveBeenCalled();

    // Same typo again is no longer auto-applied.
    commits.length = 0;
    await type(app, "teh ");
    expect(commits).not.toContain("the ");
  });

  it("records acceptance when the user types past a correction", async () => {
    const model = UserModel.empty();
    const app = createInputAssistApp({ userModel: model, imeAdapter: noopAdapter });
    app.onFocus("input-assist-us", textContext);

    await type(app, "teh ");
    expect(model.score("teh", "the")).toBe(0); // not yet accepted
    await type(app, "x"); // typing on counts as acceptance
    expect(model.score("teh", "the")).toBeGreaterThan(0);
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
    await type(app, "teh ");

    expect(commits).toEqual([]);
  });

  it("corrects an opted-out field with Backspaces when the user enables it", async () => {
    const preferences = new ExtensionImePreferences({
      get: async () => ({
        imePreferences: { autocorrectEnabled: true, correctOptedOutFields: true },
      }),
      set: async () => {},
    });
    const sendBackspaces = vi.fn(async () => true);
    const commitText = vi.fn(async () => true);
    const app = createInputAssistApp({
      imePreferences: preferences,
      imeUi: {
        setMenuItems: () => {},
        setAssistiveWindowProperties: () => {},
      },
      imeAdapter: {
        getContextId: () => 1,
        commitText,
        deleteSurroundingText: vi.fn(async () => true),
        sendBackspaces,
      },
    });

    await app.hydrateImePreferences();
    app.onFocus("input-assist-us", {
      contextID: 1,
      type: "text",
      autoCorrect: false,
    } as chrome.input.ime.InputContext);
    await type(app, "teh ");

    expect(sendBackspaces).toHaveBeenCalledWith(3);
    expect(commitText).toHaveBeenCalledWith("the ");
  });
});
