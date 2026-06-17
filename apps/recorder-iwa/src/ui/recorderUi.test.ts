import { describe, expect, it } from "vitest";
import { RecorderUiController } from "./recorderUi.js";

describe("RecorderUiController", () => {
  it("disables interaction while listening", () => {
    const ui = new RecorderUiController();
    expect(ui.isInteractive()).toBe(true);
    ui.setListening();
    expect(ui.isInteractive()).toBe(false);
    ui.setIdle();
    expect(ui.isInteractive()).toBe(true);
  });

  it("shows partial transcript only while listening", () => {
    const ui = new RecorderUiController();
    ui.setListening();
    ui.setPartial("hello");
    expect(ui.getModel().partialText).toBe("hello");
    ui.setIdle();
    expect(ui.getModel().partialText).toBe("");
  });
});
