import { describe, expect, it } from "vitest";
import { decideCorrection } from "./decision.js";
import { SymSpellIndex } from "./symspell.js";
import type { Validator } from "./validator.js";

function validatorFor(words: string[]): Validator {
  const set = new Set(words.map((w) => w.toLowerCase()));
  return { isValid: (word) => set.has(word.toLowerCase()) };
}

describe("decideCorrection with a validator", () => {
  it("never auto-replaces a token the validator considers a real word", () => {
    // "form" and "from" are both valid; "from" is far more frequent.
    const index = SymSpellIndex.build(
      [
        { word: "from", frequency: 50_000 },
        { word: "form", frequency: 500 },
      ],
      { maxEditDistance: 2 },
    );
    const validator = validatorFor(["from", "form"]);

    const decision = decideCorrection("form", index, { validator });
    expect(decision.action).not.toBe("replace");
  });

  it("drops candidates the validator rejects as non-words", () => {
    const index = SymSpellIndex.build(
      [
        { word: "the", frequency: 10_000 },
        { word: "thz", frequency: 9_000 }, // junk entry
      ],
      { maxEditDistance: 2 },
    );
    const validator = validatorFor(["the"]);

    const decision = decideCorrection("teh", index, { validator });
    expect(decision).toMatchObject({ action: "replace", replacement: "the" });
  });

  it("still corrects a genuine misspelling that is not a real word", () => {
    const index = SymSpellIndex.build([{ word: "the", frequency: 10_000 }], {
      maxEditDistance: 2,
    });
    const validator = validatorFor(["the"]);
    // "teh" is not a valid word, so protection does not apply.
    expect(decideCorrection("teh", index, { validator })).toMatchObject({
      action: "replace",
      replacement: "the",
    });
  });
});
