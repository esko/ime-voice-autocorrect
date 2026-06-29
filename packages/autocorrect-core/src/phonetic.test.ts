import { describe, expect, it } from "vitest";
import { createPhoneticCandidates } from "./phonetic.js";

describe("createPhoneticCandidates", () => {
  it("finds and frequency-ranks words with matching Double Metaphone codes", () => {
    const candidates = createPhoneticCandidates([
      { word: "night", frequency: 1_000 },
      { word: "knight", frequency: 100 },
      { word: "unrelated", frequency: 10_000 },
    ]);

    expect(candidates.candidates("nite")).toEqual(["night", "knight"]);
  });
});
