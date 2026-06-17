import { describe, expect, it } from "vitest";
import { loadDictionaryFromText, parseDictionaryLine } from "./dictionaryLoader.js";
import { createAutocorrectEngine } from "./autocorrectEngine.js";

describe("dictionaryLoader", () => {
  it("parses word and frequency columns", () => {
    expect(parseDictionaryLine("the 10000")).toEqual({ word: "the", frequency: 10000 });
    expect(parseDictionaryLine("# comment")).toBeNull();
  });

  it("builds a dictionary usable by the autocorrect engine", () => {
    const dictionary = loadDictionaryFromText("the 10000");
    const engine = createAutocorrectEngine({ dictionary });
    expect(engine.correctToken("teh")).toMatchObject({
      kind: "corrected",
      corrected: "the",
    });
  });
});
