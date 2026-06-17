import { describe, expect, it } from "vitest";
import { populateInputDeviceSelect } from "./populateInputDevices.js";

describe("populateInputDeviceSelect", () => {
  it("adds a default option and selects the saved device", () => {
    const options: Array<{ value: string; textContent: string }> = [];
    const select = {
      value: "",
      get options() {
        return options;
      },
      replaceChildren() {
        options.length = 0;
      },
      append(option: { value: string; textContent: string }) {
        options.push(option);
      },
    } as unknown as HTMLSelectElement;

    const createElement = (tagName: string) => {
      if (tagName !== "option") {
        throw new Error(`unexpected tag ${tagName}`);
      }
      return { value: "", textContent: "" };
    };
    const originalCreateElement = globalThis.document?.createElement;
    (globalThis as { document?: { createElement: typeof createElement } }).document = {
      createElement,
    };

    try {
      populateInputDeviceSelect(
        select,
        [{ deviceId: "mic-1", label: "Built-in Mic" }],
        "mic-1",
      );
    } finally {
      if (originalCreateElement) {
        (globalThis as { document?: { createElement: typeof createElement } }).document = {
          createElement: originalCreateElement,
        };
      } else {
        delete (globalThis as { document?: unknown }).document;
      }
    }

    expect(select.value).toBe("mic-1");
    expect(options).toEqual([
      { value: "", textContent: "System default" },
      { value: "mic-1", textContent: "Built-in Mic" },
    ]);
  });
});
