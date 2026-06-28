import { describe, expect, it } from "vitest";
import { decideCorrection } from "./decision.js";
import { SymSpellIndex } from "./symspell.js";
import type { Validator } from "./validator.js";

describe("validator suggest() coverage fallback", () => {
  // The frequency list does NOT contain "phone", so SymSpell cannot generate it.
  const index = SymSpellIndex.build([{ word: "telephone", frequency: 5000 }], {
    maxEditDistance: 2,
  });
  const validator: Validator = {
    isValid: (word) => word.toLowerCase() === "phone",
    suggest: (word) => (word.toLowerCase() === "phonr" ? ["phone"] : []),
  };

  it("falls back to validator suggestions when SymSpell finds nothing", () => {
    const decision = decideCorrection("phonr", index, { validator });
    expect(decision.action).not.toBe("none");
    if (decision.action !== "none") {
      expect(decision.candidates[0]?.term).toBe("phone");
    }
  });

  it("does not use the fallback when SymSpell already has candidates", () => {
    const withCandidate = SymSpellIndex.build([{ word: "phone", frequency: 9000 }], {
      maxEditDistance: 2,
    });
    let suggestCalls = 0;
    const spyValidator: Validator = {
      isValid: () => true,
      suggest: (word) => {
        suggestCalls++;
        return [word];
      },
    };
    decideCorrection("phonr", withCandidate, { validator: spyValidator });
    expect(suggestCalls).toBe(0);
  });
});
