import { describe, expect, it } from "vitest";
import { createCommonHardCorrections, createHardCorrections } from "./hardCorrections.js";
import { decideCorrection } from "./decision.js";
import { UserModel } from "./learning.js";
import { SymSpellIndex } from "./symspell.js";

describe("hard corrections", () => {
  it("maps common misspellings case-insensitively", () => {
    const hard = createCommonHardCorrections();
    expect(hard.correctionFor("definately")).toBe("definitely");
    expect(hard.correctionFor("Recieve")).toBe("receive");
    expect(hard.correctionFor("hello")).toBeNull();
  });
});

describe("decideCorrection with hard corrections", () => {
  // Empty index: the frequency list cannot help, so only the hard map can.
  const index = SymSpellIndex.build([], { maxEditDistance: 2 });
  const hardCorrections = createHardCorrections({ definately: "definitely" });

  it("applies a hard correction even with no dictionary candidate", () => {
    expect(decideCorrection("definately", index, { hardCorrections })).toMatchObject({
      action: "replace",
      replacement: "definitely",
    });
  });

  it("preserves case", () => {
    expect(decideCorrection("Definately", index, { hardCorrections })).toMatchObject({
      action: "replace",
      replacement: "Definitely",
    });
  });

  it("respects a prior rejection", () => {
    const model = UserModel.empty();
    model.recordRejected("definately", "definitely");
    expect(
      decideCorrection("definately", index, { hardCorrections, model }).action,
    ).toBe("none");
  });
});
