import { describe, expect, it } from "vitest";
import { buildWorkletSource } from "./pcmWorklet.js";

describe("buildWorkletSource", () => {
  it("embeds the noise gate flag", () => {
    expect(buildWorkletSource(true)).toContain("this._noiseGate = true");
    expect(buildWorkletSource(false)).toContain("this._noiseGate = false");
  });
});
