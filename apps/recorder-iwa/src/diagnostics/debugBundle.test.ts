import { describe, expect, it } from "vitest";
import { buildDebugBundle } from "./debugBundle.js";

describe("recorder debugBundle", () => {
  it("redacts api keys from exported state", () => {
    const bundle = buildDebugBundle({
      elevenLabsApiKey: "sk_live_secret",
      bridgeConnected: true,
    });

    expect(bundle).not.toContain("sk_live_secret");
    expect(bundle).toContain("[REDACTED_API_KEY]");
  });
});
