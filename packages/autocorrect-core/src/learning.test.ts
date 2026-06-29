import { describe, expect, it } from "vitest";
import { UserModel } from "./learning.js";
import { decideCorrection } from "./decision.js";
import { SymSpellIndex } from "./symspell.js";

describe("UserModel", () => {
  it("scores accepted pairs up and rejected pairs down", () => {
    const model = UserModel.empty();
    expect(model.score("teh", "the")).toBe(0);

    model.recordAccepted("teh", "the");
    expect(model.score("teh", "the")).toBeGreaterThan(0);

    model.recordRejected("teh", "the");
    expect(model.wasRejected("teh", "the")).toBe(true);
  });

  it("treats accepted words as valid and round-trips a snapshot", () => {
    const model = UserModel.empty();
    model.recordAcceptedWord("Esko");
    expect(model.isAcceptedWord("esko")).toBe(true);

    const restored = UserModel.fromSnapshot(model.snapshot());
    expect(restored.isAcceptedWord("esko")).toBe(true);
  });

  it("replace() removes entries that are no longer present (unlike hydrate)", () => {
    const model = UserModel.empty();
    model.recordRejected("teh", "the");
    model.recordRejected("adn", "and");
    expect(model.wasRejected("teh", "the")).toBe(true);

    // The user deleted the "teh -> the" rejection in the options page.
    model.replace({ rejectedCorrections: { "adn→and": 1 } });
    expect(model.wasRejected("teh", "the")).toBe(false);
    expect(model.wasRejected("adn", "and")).toBe(true);
  });
});

describe("decideCorrection with a user model", () => {
  const index = SymSpellIndex.build([{ word: "the", frequency: 10_000 }], {
    maxEditDistance: 2,
  });

  it("stops auto-applying a correction the user has undone", () => {
    const model = UserModel.empty();
    expect(decideCorrection("teh", index, { model }).action).toBe("replace");

    model.recordRejected("teh", "the");
    // Still offered as a suggestion, but never auto-applied again.
    expect(decideCorrection("teh", index, { model }).action).toBe("suggest");
  });

  it("never corrects a word the user has accepted into their dictionary", () => {
    const model = UserModel.empty();
    model.recordAcceptedWord("teh");
    expect(decideCorrection("teh", index, { model }).action).toBe("none");
  });
});
