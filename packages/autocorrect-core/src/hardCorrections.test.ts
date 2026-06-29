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

  it("covers the expanded misspelling set", () => {
    const hard = createCommonHardCorrections();
    expect(hard.correctionFor("accomodate")).toBe("accommodate");
    expect(hard.correctionFor("seperate")).toBe("separate");
    expect(hard.correctionFor("Tommorrow")).toBe("tomorrow");
    expect(hard.correctionFor("vehical")).toBe("vehicle");
  });

  it("never maps a misspelling to itself (no-op guard)", () => {
    const hard = createCommonHardCorrections();
    for (const word of ["accomodate", "recieve", "writting", "irresistable"]) {
      expect(hard.correctionFor(word)).not.toBe(word);
    }
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

  it("corrects accidental-shift typos (all-caps and mid-word capital)", () => {
    const hard = createHardCorrections({ teh: "the" });
    // All-caps and a stray internal capital are motor slips, not code — they must
    // still correct (and preserve the all-caps shape).
    expect(decideCorrection("TEH", index, { hardCorrections: hard })).toMatchObject({
      action: "replace",
      replacement: "THE",
    });
    // A stray Shift on an early letter reads as "capitalise the word".
    expect(decideCorrection("tEh", index, { hardCorrections: hard })).toMatchObject({
      action: "replace",
      replacement: "The",
    });
  });

  it("leaves tokens with an intentional-looking internal capital uncorrected", () => {
    const hard = createHardCorrections({ recieve: "receive" });
    // Capital on the 4th letter is not an early-Shift slip -> don't touch it.
    expect(decideCorrection("recIeve", index, { hardCorrections: hard }).action).toBe("none");
  });
});
