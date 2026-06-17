import { describe, expect, it } from "vitest";
import { float32ToPcm16, pcm16ToBase64 } from "./pcmUtils.js";

describe("pcmUtils", () => {
  it("converts float32 samples to pcm16", () => {
    const pcm = float32ToPcm16(new Float32Array([0, 1, -1]));
    expect(pcm[0]).toBe(0);
    expect(pcm[1]).toBe(32767);
    expect(pcm[2]).toBe(-32768);
  });

  it("encodes pcm16 as base64", () => {
    const encoded = pcm16ToBase64(new Int16Array([0, 256]));
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);
  });
});
