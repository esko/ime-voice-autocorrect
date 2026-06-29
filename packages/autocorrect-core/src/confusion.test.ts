import { describe, expect, it } from "vitest";
import { createCommonConfusionSets, createConfusionSets } from "./confusion.js";
import { decideCorrection } from "./decision.js";
import { createNgramContext } from "./context.js";
import { UserModel } from "./learning.js";
import { SymSpellIndex } from "./symspell.js";

describe("confusion sets", () => {
  it("maps each word to the others it is confused with", () => {
    const sets = createConfusionSets([["form", "from"]]);
    expect(sets.alternatives("form")).toEqual(["from"]);
    expect(sets.alternatives("FROM")).toEqual(["form"]);
    expect(sets.alternatives("other")).toEqual([]);
  });
});

describe("real-word correction via confusion sets", () => {
  // Both words are valid (present in the index).
  const index = SymSpellIndex.build(
    [
      { word: "form", frequency: 1000 },
      { word: "from", frequency: 5000 },
    ],
    { maxEditDistance: 2 },
  );
  const confusion = createCommonConfusionSets();
  // Context strongly prefers "from" after "came".
  const context = createNgramContext({ bigrams: { "came from": 500_000 } });

  it("offers (does not auto-apply) a context-supported swap", () => {
    const decision = decideCorrection("form", index, {
      confusion,
      context,
      previousWords: ["came"],
    });
    expect(decision.action).toBe("suggest");
    if (decision.action === "suggest") {
      expect(decision.candidates[0]?.term).toBe("from");
    }
  });

  it("never auto-applies a real-word swap, even one the user accepted before", () => {
    // Replacing a correctly-spelled word is the worst failure mode, so a learned
    // confusion swap is still only offered — the user keeps the final say.
    const model = UserModel.empty();
    model.recordAccepted("form", "from");
    const decision = decideCorrection("form", index, {
      confusion,
      context,
      previousWords: ["came"],
      model,
    });
    expect(decision.action).toBe("suggest");
    if (decision.action === "suggest") {
      expect(decision.candidates[0]?.term).toBe("from");
    }
  });

  it("leaves the valid word alone without supporting context", () => {
    expect(decideCorrection("form", index, { confusion }).action).toBe("none");
  });

  it("offers principal when context indicates a person rather than a rule", () => {
    const principalIndex = SymSpellIndex.build(
      [
        { word: "principal", frequency: 2_000 },
        { word: "principle", frequency: 2_000 },
      ],
      { maxEditDistance: 2 },
    );
    const schoolContext = createNgramContext({
      bigrams: { "school principal": 246_079 },
    });

    const decision = decideCorrection("principle", principalIndex, {
      confusion,
      context: schoolContext,
      previousWords: ["school"],
    });

    expect(decision.action).toBe("suggest");
    if (decision.action === "suggest") {
      expect(decision.candidates[0]?.term).toBe("principal");
    }
  });
});
