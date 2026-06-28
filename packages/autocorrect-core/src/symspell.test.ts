import { describe, it, expect } from "vitest";
import { SymSpellIndex } from "./symspell.js";

describe("SymSpellIndex", () => {
  const dictionary = [
    { word: "the", frequency: 100 },
    { word: "receive", frequency: 50 },
    { word: "necessarily", frequency: 10 },
  ];

  it("builds the deletion index once for a dictionary fixture", () => {
    const index = SymSpellIndex.build(dictionary, { maxEditDistance: 2 });
    expect(index.hasExact("the")).toBe(true);
    expect(index.hasExact("teh")).toBe(false);
  });

  it("lookup does not rebuild the index and finds corrects", () => {
    const index = SymSpellIndex.build(dictionary, { maxEditDistance: 2 });
    
    let candidates = index.lookup("teh");
    expect(candidates[0]?.term).toBe("the");

    candidates = index.lookup("recieve");
    expect(candidates[0]?.term).toBe("receive");

    candidates = index.lookup("neessarily");
    expect(candidates[0]?.term).toBe("necessarily");
  });

  it("recognizes personal dictionary entries", () => {
    const mainIndex = SymSpellIndex.build(dictionary, { maxEditDistance: 2 });
    const withPersonal = mainIndex.withPersonalEntries([{ word: "customword", frequency: 1 }]);
    
    expect(withPersonal.hasExact("customword")).toBe(true);
    expect(withPersonal.lookup("custmword")[0]?.term).toBe("customword");
    expect(withPersonal.lookup("custmword")[0]?.source).toBe("personal");
    
    // original unaffected
    expect(mainIndex.hasExact("customword")).toBe(false);
  });

  it("frequency ranking is stable", () => {
    const index = SymSpellIndex.build([
      { word: "there", frequency: 100 },
      { word: "their", frequency: 90 },
      { word: "they're", frequency: 80 }
    ], { maxEditDistance: 2 });

    const candidates = index.lookup("ther");
    expect(candidates[0]?.term).toBe("there");
    expect(candidates[1]?.term).toBe("their");
  });
});
