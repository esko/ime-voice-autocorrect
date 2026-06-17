import type { RecorderUiController } from "./recorderUi.js";

export function bindRecorderUi(
  ui: RecorderUiController,
  elements: {
    status: HTMLElement;
    partial: HTMLElement;
    levelBar: HTMLElement;
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
  };

  render();
  return render;
}
