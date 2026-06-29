import { describe, expect, it } from "vitest";
import { createAutocorrectEngine } from "./autocorrectEngine.js";
import { createTestDictionary } from "./dictionary.js";
import { extractLastWord, isWordBoundary } from "./tokenizer.js";

describe("tokenizer", () => {
  it("detects word boundaries", () => {
    expect(isWordBoundary(" ")).toBe(true);
    expect(isWordBoundary("a")).toBe(false);
  });

  it("extracts the last word before a boundary", () => {
    expect(extractLastWord("say teh")).toBe("teh");
  });
});

describe("autocorrect on word boundary", () => {
  it("corrects teh to the", () => {
    const engine = createAutocorrectEngine({
      dictionary: createTestDictionary(),
    });

    expect(engine.correctToken("teh")).toMatchObject({
      kind: "corrected",
      original: "teh",
      corrected: "the",
    });
  });

  it("corrects recieve to receive", () => {
    const engine = createAutocorrectEngine({
      dictionary: createTestDictionary({
        entries: [{ word: "receive", frequency: 900 }],
      }),
    });

    expect(engine.correctToken("recieve")).toMatchObject({
      kind: "corrected",
      original: "recieve",
      corrected: "receive",
    });
  });

  it("prefers keyboard-neighbor typos such as chromr to chrome", () => {
    const engine = createAutocorrectEngine({
      dictionary: createTestDictionary(),
    });

    expect(engine.correctToken("chromr")).toMatchObject({
      kind: "corrected",
      corrected: "chrome",
    });
  });

  it("reaches a long word with three adjacent-key substitutions", () => {
    const engine = createAutocorrectEngine({
      dictionary: createTestDictionary({
        entries: [{ word: "keyboard", frequency: 10_000 }],
      }),
    });

    expect(engine.correctToken("jwtboard")).toMatchObject({
      kind: "corrected",
      corrected: "keyboard",
    });
  });

  it("does not widen three-edit correction to unrelated substitutions", () => {
    const engine = createAutocorrectEngine({
      dictionary: createTestDictionary({
        entries: [{ word: "keyboard", frequency: 10_000 }],
      }),
    });

    expect(engine.correctToken("xyzboard")).toEqual({
      kind: "unchanged",
      original: "xyzboard",
    });
  });

  it("reaches a long word with three adjacent transpositions", () => {
    const engine = createAutocorrectEngine({
      dictionary: createTestDictionary({
        entries: [{ word: "keyboard", frequency: 10_000 }],
      }),
    });

    expect(engine.correctToken("ekbyaord")).toMatchObject({
      kind: "corrected",
      corrected: "keyboard",
    });
  });

  it("reaches a long word after three bounced keys", () => {
    const engine = createAutocorrectEngine({
      dictionary: createTestDictionary({
        entries: [{ word: "keyboard", frequency: 10_000 }],
      }),
    });

    expect(engine.correctToken("kkeeyyboard")).toMatchObject({
      kind: "corrected",
      corrected: "keyboard",
    });
  });

  it("reaches a long word after three dropped double letters", () => {
    const engine = createAutocorrectEngine({
      dictionary: createTestDictionary({
        entries: [{ word: "bookkeeper", frequency: 10_000 }],
      }),
    });

    expect(engine.correctToken("bokeper")).toMatchObject({
      kind: "corrected",
      corrected: "bookkeeper",
    });
  });

  it("ignores Finnish tokens containing å, ä, or ö", () => {
    const engine = createAutocorrectEngine({
      dictionary: createTestDictionary(),
    });

    expect(engine.correctToken("tämä")).toEqual({
      kind: "unchanged",
      original: "tämä",
    });
  });

  it("ignores technical tokens", () => {
    const engine = createAutocorrectEngine({
      dictionary: createTestDictionary(),
    });

    for (const token of ["fooBar", "snake_case", "kebab-case", "API_KEY", "https://example.com"]) {
      expect(engine.correctToken(token)).toEqual({
        kind: "unchanged",
        original: token,
      });
    }
  });

  it("does not correct ambiguous candidates", () => {
    // "cot" is one edit from both "cat" and "cut" with equal frequency, so the
    // margin is zero and the engine must not pick one over the other.
    const engine = createAutocorrectEngine({
      dictionary: createTestDictionary({
        entries: [
          { word: "cat", frequency: 100 },
          { word: "cut", frequency: 100 },
        ],
      }),
    });

    expect(engine.correctToken("cot")).toEqual({
      kind: "unchanged",
      original: "cot",
    });
  });

  it("honors personal dictionary and ignore list", () => {
    const engine = createAutocorrectEngine({
      dictionary: createTestDictionary(),
      personalDictionary: ["teh"],
      ignoreList: ["chromr"],
    });

    expect(engine.correctToken("teh")).toEqual({
      kind: "unchanged",
      original: "teh",
    });

    expect(engine.correctToken("chromr")).toEqual({
      kind: "unchanged",
      original: "chromr",
    });
  });

  it("returns undo metadata for corrections", () => {
    const engine = createAutocorrectEngine({
      dictionary: createTestDictionary(),
    });

    const result = engine.correctToken("teh");
    expect(result).toMatchObject({
      kind: "corrected",
      undo: { restore: "teh", deleteLength: 3 },
    });
  });
});
