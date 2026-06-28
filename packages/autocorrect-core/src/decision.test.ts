import { describe, expect, it } from "vitest";
import { confidence, decideCorrection, sigmoid } from "./decision.js";
import { createTestDictionary } from "./dictionary.js";
import { SymSpellIndex } from "./symspell.js";

function indexOf(entries: { word: string; frequency: number }[], maxEditDistance = 2) {
  return SymSpellIndex.build(entries, { maxEditDistance });
}

describe("confidence", () => {
  it("rises with the margin over original and second-best", () => {
    expect(confidence(5, 0, 1)).toBeGreaterThan(confidence(2, 0, 1));
    expect(confidence(5, 0, 4.9)).toBeLessThan(confidence(5, 0, 1)); // tight second
    expect(sigmoid(0)).toBeCloseTo(0.5, 5);
  });
});

describe("decideCorrection", () => {
  const dict = createTestDictionary();
  const index = indexOf([...dict.entries], dict.maxEditDistance);

  it("replaces a high-confidence transposition (teh -> the)", () => {
    const decision = decideCorrection("teh", index);
    expect(decision).toMatchObject({ action: "replace", replacement: "the" });
  });

  it("preserves case on replacement (Teh -> The)", () => {
    const decision = decideCorrection("Teh", index);
    expect(decision).toMatchObject({ action: "replace", replacement: "The" });
  });

  it("never autocorrects 1–2 character tokens", () => {
    expect(decideCorrection("th", index).action).toBe("none");
  });

  it("leaves known/valid words alone", () => {
    expect(decideCorrection("the", index).action).toBe("none");
  });

  it("ignores code/url/email-like tokens", () => {
    for (const token of ["fooBar", "snake_case", "https://x.io"]) {
      expect(decideCorrection(token, index).action).toBe("none");
    }
  });

  it("respects the ignore set", () => {
    expect(
      decideCorrection("teh", index, { ignored: new Set(["teh"]) }).action,
    ).toBe("none");
  });

  it("corrects motor-difficulty multi-key slips (accessibility)", () => {
    const wordIndex = indexOf([{ word: "word", frequency: 5000 }]);
    // single neighbour sub, two neighbour subs, and a doubled key
    for (const typo of ["wprd", "wprf", "woord"]) {
      expect(decideCorrection(typo, wordIndex)).toMatchObject({
        action: "replace",
        replacement: "word",
      });
    }
  });

  it("suggests rather than replaces when two candidates are close", () => {
    const ambiguous = indexOf([
      { word: "cat", frequency: 100 },
      { word: "cut", frequency: 100 },
    ]);
    // "cot" is one edit from both; equal scores -> no confident replacement.
    expect(decideCorrection("cot", ambiguous).action).not.toBe("replace");
  });
});
