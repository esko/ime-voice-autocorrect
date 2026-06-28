import { describe, expect, it } from "vitest";
import {
  caseShapeScore,
  editDistanceScore,
  frequencyScore,
  keyboardTypoScore,
  maxEditDistanceForLength,
} from "./scoring.js";

describe("frequencyScore", () => {
  it("is log-damped so common words do not dominate linearly", () => {
    expect(frequencyScore(10_000)).toBeCloseTo(Math.log10(10_001) * 1.2, 5);
    expect(frequencyScore(1_000_000)).toBeLessThan(frequencyScore(100) * 4);
  });
});

describe("editDistanceScore", () => {
  it("prefers small edits and punishes large ones", () => {
    expect(editDistanceScore(1, 4)).toBeGreaterThan(editDistanceScore(2, 6));
    expect(editDistanceScore(2, 6)).toBeGreaterThan(0);
    expect(editDistanceScore(2, 3)).toBeLessThan(0); // distance 2 on a short word
    expect(editDistanceScore(3, 9)).toBeLessThan(0);
  });
});

describe("maxEditDistanceForLength", () => {
  it("caps reach by token length, allowing distance 2 from length 4", () => {
    expect(maxEditDistanceForLength(2)).toBe(0);
    expect(maxEditDistanceForLength(3)).toBe(1);
    expect(maxEditDistanceForLength(4)).toBe(2);
    expect(maxEditDistanceForLength(8)).toBe(2);
  });
});

describe("keyboardTypoScore", () => {
  it("rewards adjacent transpositions", () => {
    expect(keyboardTypoScore("teh", "the")).toBeCloseTo(1.4, 5);
  });

  it("rewards neighbouring-key substitutions over distant ones", () => {
    // "chromr" -> "chrome": r and e are adjacent keys.
    expect(keyboardTypoScore("chromr", "chrome")).toBeGreaterThan(0);
    // a -> o are not neighbours, so a far substitution is penalised.
    expect(keyboardTypoScore("cat", "cot")).toBeLessThan(0);
  });

  it("scores motor-difficulty mistakes highly (accessibility)", () => {
    // Two neighbouring-key substitutions in one word (multi-key slip).
    expect(keyboardTypoScore("wprf", "word")).toBeCloseTo(3.0, 5);
    // Doubled key (tremor bounce).
    expect(keyboardTypoScore("woord", "word")).toBeCloseTo(1.3, 5);
    // Brushed an adjacent key (fat-finger insertion): p is next to o.
    expect(keyboardTypoScore("wpord", "word")).toBeCloseTo(1.2, 5);
  });
});

describe("caseShapeScore", () => {
  it("favours plain lowercase and penalises intentional caps", () => {
    expect(caseShapeScore("teh")).toBeGreaterThan(0);
    expect(caseShapeScore("Teh")).toBeGreaterThanOrEqual(0);
    expect(caseShapeScore("McDonald")).toBeLessThan(0);
  });
});
