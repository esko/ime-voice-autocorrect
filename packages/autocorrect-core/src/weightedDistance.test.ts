import { describe, expect, it } from "vitest";
import { weightedKeyboardDistance } from "./weightedDistance.js";

describe("weightedKeyboardDistance", () => {
  it("is zero for identical words and case-insensitive", () => {
    expect(weightedKeyboardDistance("word", "word")).toBe(0);
    expect(weightedKeyboardDistance("Word", "word")).toBe(0);
  });

  it("discounts neighbouring-key substitutions below far ones", () => {
    // o->p and r->e are adjacent keys; a->z->... apart.
    const plausible = weightedKeyboardDistance("wprd", "word"); // two neighbour subs
    const coincidental = weightedKeyboardDistance("xyrd", "word"); // far subs
    expect(plausible).toBeLessThan(coincidental);
    // Two adjacent-key slips should land near one unit cost, not two.
    expect(plausible).toBeLessThanOrEqual(1.0);
  });

  it("treats a doubled key as a cheap slip (tremor bounce)", () => {
    expect(weightedKeyboardDistance("woord", "word")).toBeLessThan(0.5);
    expect(weightedKeyboardDistance("hellllo", "hello")).toBeLessThan(1.0);
  });

  it("treats a dropped double letter as cheap", () => {
    // "comon" is missing one of the doubled m's of "common".
    expect(weightedKeyboardDistance("comon", "common")).toBeLessThan(0.5);
  });

  it("treats a brushed adjacent key as a cheap insertion", () => {
    // extra 'p' next to 'o' in "word".
    expect(weightedKeyboardDistance("wpord", "word")).toBeLessThan(0.7);
  });

  it("keeps full cost for an unrelated insertion", () => {
    expect(weightedKeyboardDistance("wzord", "word")).toBeCloseTo(1.0, 5);
  });

  it("scores a transposition cheaply", () => {
    expect(weightedKeyboardDistance("teh", "the")).toBeCloseTo(0.3, 5);
  });

  it("charges full unit cost for a single non-adjacent substitution", () => {
    // a and o are not neighbours, so "cot" -> "cat" is a full substitution.
    expect(weightedKeyboardDistance("cot", "cat")).toBeCloseTo(1.0, 5);
    // ...clearly dearer than a neighbouring-key substitution of the same shape.
    expect(weightedKeyboardDistance("cot", "cat")).toBeGreaterThan(
      weightedKeyboardDistance("xat", "cat"), // x is adjacent to c
    );
  });
});
