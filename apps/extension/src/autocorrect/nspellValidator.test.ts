import { describe, expect, it } from "vitest";
import { createNspellValidator, loadEnglishValidator } from "./nspellValidator.js";

const AFF = "SET UTF-8\nREP 1\nREP f ph\n";
const DIC = "2\nhello\nworld\n";

describe("createNspellValidator", () => {
  it("validates known words and rejects unknown ones", () => {
    const validator = createNspellValidator(AFF, DIC);
    expect(validator.isValid("hello")).toBe(true);
    expect(validator.isValid("helo")).toBe(false);
  });
});

describe("loadEnglishValidator", () => {
  it("fetches the aff/dic via the provided loader and mines REP rules", async () => {
    const { validator, repRules } = await loadEnglishValidator(
      (path) => `chrome-extension://abc/${path}`,
      async (url) => (url.endsWith(".aff") ? AFF : DIC),
    );
    expect(validator.isValid("world")).toBe(true);
    expect(validator.isValid("wrold")).toBe(false);
    expect(repRules.candidates("fone")).toContain("phone");
  });
});
