import { createChromeImeAdapter } from "./ime/chromeImeAdapter.js";
import { createChromeImeUiAdapter } from "./ime/chromeImeUiAdapter.js";
import { createInputAssistApp } from "./ime/inputAssistApp.js";
import type { ExtensionSettingsCache } from "./storage/settingsCache.js";
import type { ExtensionImePreferences } from "./storage/imePreferences.js";

export function registerInputAssist(
  chromeApi: typeof chrome,
  options: {
    imeAdapter?: Parameters<typeof createInputAssistApp>[0]["imeAdapter"];
    settingsCache?: ExtensionSettingsCache;
    imePreferences?: ExtensionImePreferences;
    imeUi?: Parameters<typeof createInputAssistApp>[0]["imeUi"];
  } = {},
) {
  const imeAdapter =
    options.imeAdapter ??
    createChromeImeAdapter(
      chromeApi,
      () => app.stateManager.getActiveContext(),
      () => app.getActiveEngineId() ?? "input-assist-us",
    );
  const imeUi = options.imeUi ?? createChromeImeUiAdapter(chromeApi);
  const app = createInputAssistApp({ ...options, imeAdapter, imeUi });

  chromeApi.input.ime.onActivate.addListener((engineId) => {
    app.onActivate(engineId);
  });

  chromeApi.input.ime.onDeactivated.addListener((engineId) => {
    app.onDeactivated(engineId);
  });

  chromeApi.input.ime.onFocus.addListener((context) => {
    app.onFocus(app.getActiveEngineId() ?? "", context);
    app.syncMenuStatus();
  });

  chromeApi.input.ime.onSurroundingTextChanged.addListener((engineId, info) => {
    const contextId = app.stateManager.getActiveContextId();
    if (contextId) {
      app.stateManager.onSurroundingTextChanged(contextId, info);
    }
  });

  chromeApi.input.ime.onBlur.addListener((contextId) => {
    app.onBlur(contextId);
    app.syncMenuStatus();
  });

  chromeApi.input.ime.onMenuItemActivated.addListener((engineId, menuItemId) => {
    app.menuController?.handleItemActivated(menuItemId, engineId);
    app.syncMenuStatus();
  });

  chromeApi.input.ime.onAssistiveWindowButtonClicked.addListener((event) => {
    if (event.buttonID !== "undo" || event.windowType !== "undo") {
      return;
    }
    const contextId = app.stateManager.getActiveContextId();
    if (contextId === null) {
      return;
    }
    const undo = app.stateManager.consumeCorrectionUndo();
    if (undo) {
      void app.autocorrect.undoCorrection(contextId, {
        restore: undo.original,
        deleteLength: undo.replacement.length,
      });
    }
  });

  // onKeyEvent must return true ONLY for keys the IME consumes. Returning true
  // for a normal key swallows it (nothing types). We consume only a backspace
  // that triggers an autocorrect undo; everything else passes through.
  chromeApi.input.ime.onKeyEvent.addListener(async (engineId, keyData) => {
    if (keyData.type !== "keydown") {
      return false;
    }
    const key = keyData.key ?? "";
    app.stateManager.onKeyEvent({ key, type: "keydown" });

    if (key === "Backspace") {
      const contextId = app.stateManager.getActiveContextId();
      if (contextId !== null) {
        const undo = app.stateManager.consumeCorrectionUndo();
        if (undo) {
          void app.autocorrect.undoCorrection(contextId, {
            restore: undo.original,
            deleteLength: undo.replacement.length,
          });
          return true;
        }
      }
      return false;
    }

    if (key.length === 1) {
      const contextId = app.stateManager.getActiveContextId();
      if (contextId !== null) {
        await app.onCharacterTyped(contextId, key);
      }
    }

    return false;
  });

  return app;
}
