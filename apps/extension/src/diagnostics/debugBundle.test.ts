import { describe, expect, it } from "vitest";
import { buildDebugBundle } from "./debugBundle.js";

describe("buildDebugBundle", () => {
  it("redacts api keys from debug output", () => {
    const bundle = buildDebugBundle({
      apiKey: "sk_live_secret",
      bridgeUrl: "wss://example.test?token=abc123",
    });

    expect(bundle).not.toContain("sk_live_secret");
    expect(bundle).not.toContain("abc123");
    expect(bundle).toContain("[REDACTED_API_KEY]");
  });
});
