import { describe, expect, it, vi } from "vitest";
import { RecorderUiController } from "./recorderUi.js";
import { bindRecorderUi } from "./domBinder.js";

describe("bindRecorderUi", () => {
  it("reflects ui model changes in the dom", () => {
    const ui = new RecorderUiController();
    const status = { textContent: "" } as HTMLElement;
    const partial = { textContent: "" } as HTMLElement;
    const levelBar = { style: { width: "" } } as HTMLElement;

    const render = bindRecorderUi(ui, { status, partial, levelBar });
    ui.setListening("hel");
    render();

    expect(status.textContent).toBe("Listening");
    expect(partial.textContent).toBe("hel");
  });

  it("hides the extras button while listening", () => {
    const ui = new RecorderUiController();
    const status = { textContent: "" } as HTMLElement;
    const partial = { textContent: "" } as HTMLElement;
    const levelBar = { style: { width: "" } } as HTMLElement;
    const surface = { classList: { toggle: vi.fn() } } as unknown as HTMLElement;
    const extrasButton = { hidden: false } as HTMLButtonElement;

    const render = bindRecorderUi(ui, { status, partial, levelBar, surface, extrasButton });
    ui.setListening("hel");
    render();

    expect(extrasButton.hidden).toBe(true);
    expect(surface.classList.toggle).toHaveBeenCalledWith("active", true);
  });
});
