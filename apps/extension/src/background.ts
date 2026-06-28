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
    userModel?: Parameters<typeof createInputAssistApp>[0]["userModel"];
    persistLearning?: Parameters<typeof createInputAssistApp>[0]["persistLearning"];
  } = {},
) {
  const imeAdapter =
    options.imeAdapter ??
    createChromeImeAdapter(
      chromeApi,
      () => app.stateManager.getActiveContext(),
      () => app.getActiveEngineId() ?? "input-assist",
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

  chromeApi.input.ime.onCandidateClicked.addListener((engineId, candidateId) => {
    void app.onCandidateClicked(candidateId);
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
      app.recordRejection(undo.original, undo.replacement);
    }
  });

  // This listener MUST be synchronous and return a real boolean. An async
  // listener returns a (truthy) Promise, which ChromeOS treats as "key handled"
  // and swallows EVERY keystroke. Return true only for keys we consume (a
  // backspace that triggers an autocorrect undo); the autocorrect commit work is
  // fired without awaiting so the return stays synchronous.
  chromeApi.input.ime.onKeyEvent.addListener((engineId, keyData) => {
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
          app.recordRejection(undo.original, undo.replacement);
          return true;
        }
      }
      return false;
    }

    if (key.length === 1) {
      const contextId = app.stateManager.getActiveContextId();
      if (contextId !== null) {
        void app.onCharacterTyped(contextId, key);
      }
    }

    return false;
  });

  return app;
}
