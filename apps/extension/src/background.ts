import { ContextTracker } from "./ime/contextTracker.js";
import { createInputAssistApp } from "./ime/inputAssistApp.js";
import type { BridgePort } from "./bridge/server.js";

export function registerInputAssist(
  chromeApi: typeof chrome,
  options: {
    allowedOrigin: string;
    launchRecorder: () => Promise<void>;
    imeAdapter: Parameters<typeof createInputAssistApp>[0]["imeAdapter"];
  },
) {
  const app = createInputAssistApp(options);
  let activeEngineId = "input-assist-us";

  chromeApi.input.ime.onActivate.addListener((engineId) => {
    activeEngineId = engineId;
  });

  chromeApi.input.ime.onFocus.addListener((context) => {
    app.onFocus(activeEngineId, context);
  });

  chromeApi.input.ime.onBlur.addListener((contextId) => {
    app.onBlur(contextId);
  });

  chromeApi.input.ime.onKeyEvent.addListener(async (engineId, keyData) => {
    const key = keyData.key ?? "";
    const type = keyData.type === "keyup" ? "keyup" : "keydown";
    const route = app.keyRouter.route(key, type);

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
