import { describe, expect, it } from "vitest";
import { loadEnglishDictionary } from "./dictionaryLoader.js";

describe("loadEnglishDictionary", () => {
  it("parses the bundled word\\tfrequency table into a dictionary", async () => {
    const dictionary = await loadEnglishDictionary(
      (path) => path,
      async () => "the\t23135851162\nword\t98671341\n",
    );
    expect(dictionary.maxEditDistance).toBe(2);
    expect(dictionary.entries).toEqual([
      { word: "the", frequency: 23135851162 },
      { word: "word", frequency: 98671341 },
    ]);
  });
});
