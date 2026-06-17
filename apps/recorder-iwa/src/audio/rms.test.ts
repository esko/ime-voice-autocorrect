import { describe, expect, it } from "vitest";
import { computeRms } from "./rms.js";

describe("computeRms", () => {
  it("returns zero for silence", () => {
    expect(computeRms(new Float32Array([0, 0, 0]))).toBe(0);
  });

  it("returns positive level for non-zero samples", () => {
    expect(computeRms(new Float32Array([0.5, 0.5]))).toBeGreaterThan(0);
  });
});
