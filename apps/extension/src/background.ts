import { InputStateManager } from "./ime/inputStateManager.js";
import { createChromeImeAdapter } from "./ime/chromeImeAdapter.js";
import { createChromeImeUiAdapter } from "./ime/chromeImeUiAdapter.js";
import { createInputAssistApp } from "./ime/inputAssistApp.js";
import type { BridgePort } from "./bridge/server.js";
import type { ExtensionSettingsCache } from "./storage/settingsCache.js";
import type { ExtensionImePreferences } from "./storage/imePreferences.js";

export function registerInputAssist(
  chromeApi: typeof chrome,
  options: {
    allowedOrigin: string;
    launchRecorder: () => Promise<void>;
    imeAdapter?: Parameters<typeof createInputAssistApp>[0]["imeAdapter"];
    settingsCache?: ExtensionSettingsCache;
    imePreferences?: ExtensionImePreferences;
    imeUi?: Parameters<typeof createInputAssistApp>[0]["imeUi"];
  },
) {
  let activeEngineId = "input-assist-us";
  
  const imeAdapter =
    options.imeAdapter ??
    createChromeImeAdapter(
      chromeApi,
      () => app.stateManager.getActiveContext(),
      () => activeEngineId,
      () => app.stateManager.getContextToken()
    );
  const imeUi = options.imeUi ?? createChromeImeUiAdapter(chromeApi);
  const app = createInputAssistApp({ ...options, imeAdapter, imeUi });

  chromeApi.input.ime.onActivate.addListener((engineId) => {
    activeEngineId = engineId;
    app.refreshImeMenu(engineId);
  });

  chromeApi.input.ime.onFocus.addListener((context) => {
    app.onFocus(activeEngineId, context);
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
      void app.autocorrect.undoCorrection(contextId, { restore: undo.original, deleteLength: undo.replacement.length });
    }
  });

  chromeApi.input.ime.onKeyEvent.addListener(async (engineId, keyData) => {
    const key = keyData.key ?? "";
    const type = keyData.type === "keyup" ? "keyup" : "keydown";
    const route = app.keyRouter.route(key, type);

    if (route === "pass-through") {
      // First let stateManager update its internal tracking
      app.stateManager.onKeyEvent({ key, type });

      if (type === "keydown" && key === "Backspace") {
        const contextId = app.stateManager.getActiveContextId();
        if (contextId !== null) {
          const undo = app.stateManager.consumeCorrectionUndo();
          if (undo) {
            void app.autocorrect.undoCorrection(contextId, { restore: undo.original, deleteLength: undo.replacement.length });
            return false;
          }
        }
      }

      if (type === "keydown" && key.length === 1) {
        const contextId = app.stateManager.getActiveContextId();
        if (contextId !== null) {
          await app.onCharacterTyped(contextId, key);
        }
      }
    }

    return route === "pass-through";
  });

  return app;
}

export function connectExternalRecorder(
  app: ReturnType<typeof createInputAssistApp>,
  port: BridgePort,
  senderUrl: string,
): boolean {
  const connected = app.bridge.connect(port, senderUrl);
  if (connected) {
    app.syncMenuStatus();
  }
  return connected;
}

export { InputStateManager };
