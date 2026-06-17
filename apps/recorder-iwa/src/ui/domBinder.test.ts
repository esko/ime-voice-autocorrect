import { describe, expect, it } from "vitest";
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
});
