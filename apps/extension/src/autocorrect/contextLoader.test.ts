import { describe, expect, it } from "vitest";
import { loadEnglishContext, parseBigramTable } from "./contextLoader.js";

describe("parseBigramTable", () => {
  it("parses tab-separated bigram counts and skips junk lines", () => {
    const table = parseBigramTable("of the\t2766332391\nin the\t1628795324\n\nbad line\n");
    expect(table["of the"]).toBe(2766332391);
    expect(table["in the"]).toBe(1628795324);
    expect(Object.keys(table)).toHaveLength(2);
  });
});

describe("loadEnglishContext", () => {
  it("builds a context model from the fetched corpus", async () => {
    const context = await loadEnglishContext(
      (path) => `chrome-extension://abc/${path}`,
      async () => "came from\t6233307\n",
    );
    expect(context.score(["came"], "from")).toBeGreaterThan(0);
    expect(context.score(["came"], "form")).toBe(0);
  });
});
