import { describe, expect, it } from "vitest";
import { appendKeyterms, collectAsrKeyterms, MAX_ASR_KEYTERMS } from "./keyterms.js";

describe("collectAsrKeyterms", () => {
  it("merges personal and technical terms without duplicates", () => {
    expect(
      collectAsrKeyterms(["Kubernetes", "esko"], ["kubernetes", "symspell"]),
    ).toEqual(["Kubernetes", "esko", "symspell"]);
  });

  it("caps keyterms at the provider limit", () => {
    const personal = Array.from({ length: MAX_ASR_KEYTERMS + 5 }, (_, index) => `word${index}`);
    expect(collectAsrKeyterms(personal, [])).toHaveLength(MAX_ASR_KEYTERMS);
  });
});

describe("appendKeyterms", () => {
  it("appends repeated keyterms query params", () => {
    const params = new URLSearchParams();
    appendKeyterms(params, ["foo", "bar"]);
    expect(params.getAll("keyterms")).toEqual(["foo", "bar"]);
  });
});
