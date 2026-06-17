import { describe, expect, it } from "vitest";
import { isDictationAllowed, isUnsafeField } from "./unsafeField.js";

describe("unsafeField", () => {
  it("treats password fields as unsafe", () => {
    expect(isUnsafeField("password")).toBe(true);
    expect(isDictationAllowed("password")).toBe(false);
  });

  it("allows normal text fields", () => {
    expect(isUnsafeField("text")).toBe(false);
    expect(isDictationAllowed("text")).toBe(true);
  });
});
