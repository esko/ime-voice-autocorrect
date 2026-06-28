import { describe, expect, it } from "vitest";
import { contextScore, createBigramModel } from "./context.js";
import { decideCorrection } from "./decision.js";
import { SymSpellIndex } from "./symspell.js";

describe("contextScore", () => {
  const bigrams = createBigramModel({ "in the": 1_000_000, "to be": 100 });

  it("rewards a candidate that forms a common bigram", () => {
    expect(contextScore("in", "the", bigrams)).toBeGreaterThan(0);
    expect(contextScore("in", "ten", bigrams)).toBe(0);
  });

  it("is zero without a previous word or model", () => {
    expect(contextScore(undefined, "the", bigrams)).toBe(0);
    expect(contextScore("in", "the", undefined)).toBe(0);
  });

  it("is bounded so context cannot dominate", () => {
    expect(contextScore("in", "the", bigrams)).toBeLessThanOrEqual(1.5);
  });
});

describe("decideCorrection with context", () => {
  it("lets the previous word tip a borderline case into a replacement", () => {
    const index = SymSpellIndex.build(
      [
        { word: "the", frequency: 1000 },
        { word: "tea", frequency: 1000 },
      ],
      { maxEditDistance: 2 },
    );
    const bigrams = createBigramModel({ "in the": 2_000_000 });

    // Without context the two candidates are close enough to only suggest.
    expect(decideCorrection("teh", index, { bigrams }).action).not.toBe("replace");
    // "in the" is a strong bigram, so with context "the" is confidently chosen.
    expect(decideCorrection("teh", index, { bigrams, previousWord: "in" })).toMatchObject({
      action: "replace",
      replacement: "the",
    });
  });
});
