import { describe, expect, it } from "vitest";
import { PROTOCOL_VERSION } from "./version.js";

describe("protocol package", () => {
  it("exposes the bridge protocol version", () => {
    expect(PROTOCOL_VERSION).toBe(1);
  });
});
