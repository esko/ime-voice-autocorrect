import { describe, expect, it } from "vitest";
import { formatWordList, parseWordList } from "./wordLists.js";

describe("wordLists", () => {
  it("parses comma and newline separated words", () => {
    expect(parseWordList("Foo, bar\nbaz")).toEqual(["foo", "bar", "baz"]);
  });

  it("formats words one per line", () => {
    expect(formatWordList(["foo", "bar"])).toBe("foo\nbar");
  });
});
