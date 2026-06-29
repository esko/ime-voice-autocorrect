import { describe, expect, it } from "vitest";
import { createNgramContext, createCommonContext } from "./context.js";
import { decideCorrection } from "./decision.js";
import { SymSpellIndex } from "./symspell.js";

describe("ContextModel", () => {
  const model = createNgramContext({
    bigrams: { "to the": 1_000_000 },
    trigrams: { "went to the": 500_000 },
  });

  it("rewards a candidate that forms a common bigram", () => {
    expect(model.score(["to"], "the")).toBeGreaterThan(0);
    expect(model.score(["to"], "ten")).toBe(0);
  });

  it("rewards a candidate that forms a common bigram with the next word", () => {
    const rightContext = createNgramContext({
      bigrams: { "the answer": 1_000_000 },
    });

    expect(rightContext.score([], "the", "answer")).toBeGreaterThan(0);
    expect(rightContext.score([], "ten", "answer")).toBe(0);
  });

  it("prefers a trigram match over the bigram backoff", () => {
    const trigram = model.score(["went", "to"], "the");
    const bigram = model.score(["to"], "the");
    expect(trigram).toBeGreaterThan(bigram);
  });

  it("is zero without preceding words and bounded otherwise", () => {
    expect(model.score([], "the")).toBe(0);
    expect(model.score(["went", "to"], "the")).toBeLessThanOrEqual(1.5);
  });
});

describe("decideCorrection with context", () => {
  it("lets context tip a borderline case into a replacement", () => {
    const index = SymSpellIndex.build(
      [
        { word: "the", frequency: 1000 },
        { word: "tea", frequency: 1000 },
      ],
      { maxEditDistance: 2 },
    );
    const context = createCommonContext();

    // Without context the two candidates are close enough to only suggest.
    expect(decideCorrection("teh", index, { context }).action).not.toBe("replace");
    // "in the" is a strong bigram, so with context "the" is confidently chosen.
    expect(
      decideCorrection("teh", index, { context, previousWords: ["in"] }),
    ).toMatchObject({ action: "replace", replacement: "the" });
  });

  it("uses the next word when correcting text before existing content", () => {
    const index = SymSpellIndex.build(
      [
        { word: "the", frequency: 1000 },
        { word: "tea", frequency: 1000 },
      ],
      { maxEditDistance: 2 },
    );
    const context = createNgramContext({
      bigrams: { "the answer": 1_000_000 },
    });

    expect(
      decideCorrection("teh", index, { context, nextWord: "answer" }),
    ).toMatchObject({ action: "replace", replacement: "the" });
  });
});
