import { ContextTracker } from "./ime/contextTracker.js";
import { createChromeImeAdapter } from "./ime/chromeImeAdapter.js";
import { createInputAssistApp } from "./ime/inputAssistApp.js";
import type { BridgePort } from "./bridge/server.js";
import type { ExtensionSettingsCache } from "./storage/settingsCache.js";

export function registerInputAssist(
  chromeApi: typeof chrome,
  options: {
    allowedOrigin: string;
    launchRecorder: () => Promise<void>;
    imeAdapter?: Parameters<typeof createInputAssistApp>[0]["imeAdapter"];
    settingsCache?: ExtensionSettingsCache;
  },
) {
  let activeContext: chrome.input.ime.InputContext | null = null;
  let activeEngineId = "input-assist-us";
  const imeAdapter =
    options.imeAdapter ??
    createChromeImeAdapter(chromeApi, () => activeContext, () => activeEngineId);
  const app = createInputAssistApp({ ...options, imeAdapter });

  chromeApi.input.ime.onActivate.addListener((engineId) => {
    activeEngineId = engineId;
  });

  chromeApi.input.ime.onFocus.addListener((context) => {
    activeContext = context;
    app.onFocus(activeEngineId, context);
  });

  chromeApi.input.ime.onBlur.addListener((contextId) => {
    if (activeContext?.contextID === contextId) {
      activeContext = null;
    }
    app.onBlur(contextId);
  });

  chromeApi.input.ime.onKeyEvent.addListener(async (engineId, keyData) => {
    const key = keyData.key ?? "";
    const type = keyData.type === "keyup" ? "keyup" : "keydown";
    const route = app.keyRouter.route(key, type);

    if (route === "pass-through" && type === "keydown" && key === "Backspace") {
      const active = app.contexts.getActive();
      if (active && (await app.autocorrect.onBackspace(active.contextId))) {
        return false;
      }
    }

    if (route === "pass-through" && type === "keydown" && key.length === 1) {
      const active = app.contexts.getActive();
      if (active) {
        await app.onCharacterTyped(active.contextId, key);
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
  return app.bridge.connect(port, senderUrl);
}

export { ContextTracker };
