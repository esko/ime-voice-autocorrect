import { describe, expect, it, vi } from "vitest";
import { SuggestionController } from "./suggestionController.js";

function setup() {
  const ui = {
    setCandidates: vi.fn(),
    setCandidateWindowVisible: vi.fn(),
  };
  const text = {
    deleteSurroundingText: vi.fn(async () => {}),
    commitText: vi.fn(async () => {}),
  };
  return { ui, text, controller: new SuggestionController(ui, text) };
}

describe("SuggestionController", () => {
  it("shows a numbered candidate window when offering", () => {
    const { ui, controller } = setup();
    controller.offer("input-assist-us", 1, "teh", " ", [{ term: "the" }, { term: "ten" }]);

    expect(controller.hasPending()).toBe(true);
    expect(ui.setCandidates).toHaveBeenCalledWith(1, [
      { id: 0, candidate: "the", label: "1" },
      { id: 1, candidate: "ten", label: "2" },
    ]);
    expect(ui.setCandidateWindowVisible).toHaveBeenCalledWith("input-assist-us", true);
  });

  it("does nothing when there are no candidates", () => {
    const { ui, controller } = setup();
    controller.offer("input-assist-us", 1, "teh", " ", []);
    expect(controller.hasPending()).toBe(false);
    expect(ui.setCandidates).not.toHaveBeenCalled();
  });

  it("replaces the token (plus delimiter) with the chosen candidate", async () => {
    const { ui, text, controller } = setup();
    controller.offer("input-assist-us", 1, "teh", " ", [{ term: "the" }, { term: "ten" }]);

    const applied = await controller.select(1);

    expect(applied).toEqual({ original: "teh", replacement: "ten" });
    // delete "teh" + the space (4), commit "ten" + space
    expect(text.deleteSurroundingText).toHaveBeenCalledWith(1, 4);
    expect(text.commitText).toHaveBeenCalledWith(1, "ten ");
    expect(ui.setCandidateWindowVisible).toHaveBeenLastCalledWith("input-assist-us", false);
    expect(controller.hasPending()).toBe(false);
  });

  it("ignores selection when nothing is pending or the id is unknown", async () => {
    const { text, controller } = setup();
    expect(await controller.select(0)).toBeNull();

    controller.offer("input-assist-us", 1, "teh", " ", [{ term: "the" }]);
    expect(await controller.select(99)).toBeNull();
    expect(text.commitText).not.toHaveBeenCalled();
  });

  it("dismiss hides the window and clears pending", () => {
    const { ui, controller } = setup();
    controller.offer("input-assist-us", 1, "teh", " ", [{ term: "the" }]);
    controller.dismiss();
    expect(controller.hasPending()).toBe(false);
    expect(ui.setCandidateWindowVisible).toHaveBeenLastCalledWith("input-assist-us", false);
  });
});
