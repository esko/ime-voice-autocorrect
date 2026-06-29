import { describe, expect, it } from "vitest";
import { parseRepRules, createRepRules, createRepRulesFromAff } from "./repRules.js";

const AFF = `SET UTF-8
TRY esianrtolcdugmphbyfvkwzxjq
REP 5
REP f ph
REP ph f
REP ^al all
REP tion$ sion
REP alot a_lot
`;

describe("parseRepRules", () => {
  it("parses REP rules and skips the header and multi-word replacements", () => {
    const rules = parseRepRules(AFF);
    // 5 listed, but "alot -> a_lot" (multi-word) is dropped; header is skipped.
    expect(rules).toHaveLength(4);
    expect(rules).toContainEqual({ from: "f", to: "ph", anchorStart: false, anchorEnd: false });
    expect(rules).toContainEqual({ from: "al", to: "all", anchorStart: true, anchorEnd: false });
    expect(rules).toContainEqual({ from: "tion", to: "sion", anchorStart: false, anchorEnd: true });
  });
});

describe("createRepRules", () => {
  const rep = createRepRulesFromAff(AFF);

  it("applies an unanchored replacement (phonetic slip)", () => {
    expect(rep.candidates("fone")).toContain("phone");
  });

  it("honours a start anchor", () => {
    // ^al -> all applies only at the start.
    expect(rep.candidates("almost")).toContain("allmost");
    expect(rep.candidates("normal")).not.toContain("normall");
  });

  it("honours an end anchor", () => {
    expect(rep.candidates("expantion")).toContain("expansion");
  });

  it("never returns the input unchanged and only emits plain words", () => {
    for (const candidate of rep.candidates("fone")) {
      expect(candidate).not.toBe("fone");
      expect(candidate).toMatch(/^[a-z]+$/);
    }
  });

  it("is case-insensitive on input", () => {
    expect(createRepRules(parseRepRules(AFF)).candidates("FONE")).toContain("phone");
  });
});
