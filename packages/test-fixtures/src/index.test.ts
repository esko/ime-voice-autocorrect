import { describe, expect, it } from "vitest";
import { TEST_FIXTURES_READY } from "./index.js";

describe("test-fixtures package", () => {
  it("is wired into the monorepo", () => {
    expect(TEST_FIXTURES_READY).toBe(true);
  });
});
