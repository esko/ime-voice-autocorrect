import type { RecorderUiController } from "./recorderUi.js";

export function bindRecorderUi(
  ui: RecorderUiController,
  elements: {
    status: HTMLElement;
    partial: HTMLElement;
    levelBar: HTMLElement;
    surface?: HTMLElement;
    extrasButton?: HTMLButtonElement;
  },
): () => void {
  const render = () => {
    const model = ui.getModel();
    elements.status.textContent =
      model.state === "error"
        ? `Error: ${model.errorMessage ?? "unknown"}`
        : model.state === "listening"
          ? "Listening"
          : "Idle";
    elements.partial.textContent = model.partialText;
    elements.levelBar.style.width = `${Math.min(100, Math.round(model.level * 100))}%`;
    if (elements.surface) {
      elements.surface.classList.toggle("active", model.state === "listening");
    }
    if (elements.extrasButton) {
      elements.extrasButton.hidden = !ui.isInteractive();
    }
  };

  render();
  return render;
}
