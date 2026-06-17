import { describe, expect, it, vi } from "vitest";
import { AssistiveUndoController, createChromeImeUiAdapter } from "./chromeImeUiAdapter.js";

describe("createChromeImeUiAdapter", () => {
  it("delegates menu and assistive window calls to chrome.input.ime", () => {
    const setMenuItems = vi.fn();
    const setAssistiveWindowProperties = vi.fn();
    const chromeApi = {
      input: {
        ime: {
          setMenuItems,
          setAssistiveWindowProperties,
        },
      },
    } as never;

    const ui = createChromeImeUiAdapter(chromeApi);
    ui.setMenuItems("input-assist-us", [{ id: "toggle-autocorrect", label: "Autocorrect" }]);
    ui.setAssistiveWindowProperties(1, { type: "undo", visible: true });

    expect(setMenuItems).toHaveBeenCalledWith({
      engineID: "input-assist-us",
      items: [{ id: "toggle-autocorrect", label: "Autocorrect" }],
    });
    expect(setAssistiveWindowProperties).toHaveBeenCalledWith({
      contextID: 1,
      properties: { type: "undo", visible: true },
    });
  });
});

describe("AssistiveUndoController", () => {
  it("shows and hides the undo assistive window for a context", () => {
    const calls: Array<{ contextId: number; properties: { visible: boolean } }> = [];
    const controller = new AssistiveUndoController({
      setMenuItems: () => {},
      setAssistiveWindowProperties: (contextId, properties) => {
        calls.push({ contextId, properties });
      },
    });

    void controller.showCorrection(3, "teh", "the");
    controller.hide();

    expect(calls[0]?.properties.visible).toBe(true);
    expect(calls[1]?.contextId).toBe(3);
    expect(calls[1]?.properties.visible).toBe(false);
  });
});
