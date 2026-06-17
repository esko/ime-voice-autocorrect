import { bootstrapRecorder } from "./recorderBootstrap.js";
import { openSettingsPage } from "./recorder/settingsUrl.js";
import { bindRecorderUi } from "./ui/domBinder.js";

const extensionId = new URLSearchParams(globalThis.location?.search ?? "").get("extensionId") ?? "";

if (typeof chrome !== "undefined" && extensionId) {
  const app = bootstrapRecorder(extensionId);
  const surface = document.getElementById("recorder-surface");
  const status = document.getElementById("status");
  const partial = document.getElementById("partial");
  const levelBar = document.querySelector("#level > span");
  const extrasButton = document.getElementById("extras-button");

  if (status && partial && levelBar) {
    const render = bindRecorderUi(app.ui, {
      status,
      partial,
      levelBar: levelBar as HTMLElement,
      surface: surface ?? undefined,
      extrasButton: extrasButton instanceof HTMLButtonElement ? extrasButton : undefined,
    });

    extrasButton?.addEventListener("click", () => {
      if (app.ui.isInteractive()) {
        openSettingsPage(extensionId);
      }
    });

    const originalSetPartial = app.ui.setPartial.bind(app.ui);
    app.ui.setPartial = (text: string) => {
      originalSetPartial(text);
      render();
    };
    const originalSetListening = app.ui.setListening.bind(app.ui);
    app.ui.setListening = (text?: string) => {
      originalSetListening(text);
      render();
    };
    const originalSetIdle = app.ui.setIdle.bind(app.ui);
    app.ui.setIdle = () => {
      originalSetIdle();
      render();
    };
    const originalSetError = app.ui.setError.bind(app.ui);
    app.ui.setError = (message: string) => {
      originalSetError(message);
      render();
    };
    const originalSetLevel = app.ui.setLevel.bind(app.ui);
    app.ui.setLevel = (level: number) => {
      originalSetLevel(level);
      render();
    };
  }
}
