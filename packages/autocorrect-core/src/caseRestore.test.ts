import { describe, expect, it } from "vitest";
import { restoreCase } from "./caseRestore.js";

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
});
