import { describe, expect, it } from "vitest";
import { buildAssistiveUndoHide, buildAssistiveUndoShow } from "./assistiveUndo.js";

describe("assistiveUndo", () => {
  it("builds show and hide assistive window properties", () => {
    expect(buildAssistiveUndoShow("teh", "the")).toEqual({
      type: "undo",
      visible: true,
      announceString: "Changed teh to the",
    });
    expect(buildAssistiveUndoHide()).toEqual({
      type: "undo",
      visible: false,
    });
  });
});
