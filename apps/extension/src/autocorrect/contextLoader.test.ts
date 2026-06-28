import { describe, expect, it } from "vitest";
import { loadEnglishContext, parseNgramTable } from "./contextLoader.js";

describe("parseNgramTable", () => {
  it("parses tab-separated counts and skips junk lines", () => {
    const table = parseNgramTable("of the\t2766332391\none of the\t66464125\n\nbad line\n");
    expect(table["of the"]).toBe(2766332391);
    expect(table["one of the"]).toBe(66464125);
    expect(Object.keys(table)).toHaveLength(2);
  });
});

describe("loadEnglishContext", () => {
  it("builds a context model from bigram + trigram corpora with backoff", async () => {
    const context = await loadEnglishContext(
      (path) => path,
      async (url) =>
        url.includes("trigrams") ? "one of the\t66464125\n" : "of the\t2766332391\n",
    );
    // trigram match preferred over the bigram backoff
    expect(context.score(["one", "of"], "the")).toBeGreaterThan(context.score(["of"], "the"));
    expect(context.score(["of"], "the")).toBeGreaterThan(0);
  });

  it("still works when the trigram file is missing", async () => {
    const context = await loadEnglishContext(
      (path) => path,
      async (url) => {
        if (url.includes("trigrams")) throw new Error("404");
        return "of the\t2766332391\n";
      },
    );
    expect(context.score(["of"], "the")).toBeGreaterThan(0);
  });
});
