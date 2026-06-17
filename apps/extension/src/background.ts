import { ContextTracker } from "./ime/contextTracker.js";
import { KeyRouter } from "./ime/keyRouter.js";

export function createImeApp() {
  const contexts = new ContextTracker();
  const keyRouter = new KeyRouter();

  return { contexts, keyRouter };
}

export function registerImeHandlers(
  chromeApi: typeof chrome,
  app = createImeApp(),
): typeof app {
  let activeEngineId = "input-assist-us";

  chromeApi.input.ime.onActivate.addListener((engineId) => {
    activeEngineId = engineId;
  });

  chromeApi.input.ime.onFocus.addListener((context) => {
    app.contexts.onFocus(activeEngineId, context);
  });

  chromeApi.input.ime.onBlur.addListener((contextId) => {
    app.contexts.onBlur(contextId);
  });

  chromeApi.input.ime.onKeyEvent.addListener((engineId, keyData) => {
    const route = app.keyRouter.route(
      keyData.key ?? "",
      keyData.type === "keyup" ? "keyup" : "keydown",
    );
    return route === "pass-through";
  });

  return app;
}

if (typeof chrome !== "undefined" && chrome.input?.ime) {
  registerImeHandlers(chrome);
}
