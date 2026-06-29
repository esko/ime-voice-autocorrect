import { describe, expect, it } from "vitest";
import { restoreCase, classifyCase, isUncorrectableCase } from "./caseRestore.js";

describe("restoreCase", () => {
  it("keeps plain lowercase", () => {
    expect(restoreCase("teh", "the")).toBe("the");
  });

  it("restores a sentence-start capital", () => {
    expect(restoreCase("Teh", "the")).toBe("The");
  });

  it("restores all caps", () => {
    expect(restoreCase("TEH", "the")).toBe("THE");
  });

  it("capitalises an accidental Shift on an early letter", () => {
    expect(restoreCase("tEh", "the")).toBe("The");
    expect(restoreCase("teH", "the")).toBe("The");
  });
});

describe("classifyCase", () => {
  it("identifies the case shapes", () => {
    expect(classifyCase("the")).toBe("lower");
    expect(classifyCase("The")).toBe("capitalized");
    expect(classifyCase("THE")).toBe("upper");
    expect(classifyCase("tHe")).toBe("shift-capital"); // capital on the 2nd letter
    expect(classifyCase("thE")).toBe("shift-capital"); // capital on the 3rd letter
    expect(classifyCase("abcD")).toBe("mixed"); // capital too late to be a Shift slip
    expect(classifyCase("tHEy")).toBe("mixed"); // multiple internal capitals
  });
});

describe("isUncorrectableCase", () => {
  it("flags only the intentional-looking mixed-case tokens", () => {
    expect(isUncorrectableCase("tEh")).toBe(false); // early Shift -> correctable
    expect(isUncorrectableCase("teh")).toBe(false);
    expect(isUncorrectableCase("TEH")).toBe(false);
    expect(isUncorrectableCase("abcD")).toBe(true); // capital on the 4th letter
    expect(isUncorrectableCase("McX")).toBe(true);
  });
});
