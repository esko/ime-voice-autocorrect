import { describe, expect, it } from "vitest";
import { normalizeLearningData, toView, removeEntry } from "./learnedData.js";

describe("learnedData", () => {
  const data = {
    acceptedCorrections: { "adn→and": 2 },
    rejectedCorrections: { "teh→the": 1, "wich→which": 1 },
    acceptedWords: { esko: 1 },
  };

  it("normalizes arbitrary stored values into a clean shape", () => {
    expect(normalizeLearningData(null)).toEqual({
      acceptedCorrections: {},
      rejectedCorrections: {},
      acceptedWords: {},
    });
    expect(
      normalizeLearningData({ rejectedCorrections: { "teh→the": 1, bad: 0, junk: "x" } })
        .rejectedCorrections,
    ).toEqual({ "teh→the": 1 });
  });

  it("builds a sorted, parsed view split into original/replacement", () => {
    const view = toView(data);
    expect(view.isEmpty).toBe(false);
    expect(view.rejected).toEqual([
      { key: "teh→the", original: "teh", replacement: "the", count: 1 },
      { key: "wich→which", original: "wich", replacement: "which", count: 1 },
    ]);
    expect(view.accepted[0]?.original).toBe("adn");
    expect(view.words).toEqual([{ word: "esko", count: 1 }]);
  });

  it("removes a single entry without touching the others", () => {
    const next = removeEntry(data, "rejected", "teh→the");
    expect(next.rejectedCorrections).toEqual({ "wich→which": 1 });
    // Original is untouched (pure).
    expect(data.rejectedCorrections["teh→the"]).toBe(1);
    expect(next.acceptedCorrections).toEqual(data.acceptedCorrections);
  });

  it("reports an empty view when nothing is learned", () => {
    expect(toView(normalizeLearningData(null)).isEmpty).toBe(true);
  });
});
