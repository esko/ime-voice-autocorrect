import { describe, expect, it } from "vitest";
import { buildRecorderDiagnosticsState } from "./diagnosticsState.js";

describe("buildRecorderDiagnosticsState", () => {
  it("includes bridge status and redacts api keys from nested settings", () => {
    const state = buildRecorderDiagnosticsState({
      bridgeConnected: true,
      protocolVersion: 1,
      lastAsrError: null,
      micLevel: 0.12,
      settings: {
        activationMode: "push-to-talk",
        personalDictionary: ["Input Assist"],
      },
      apiKey: "sk_secret123",
    });

    expect(state.bridgeConnected).toBe(true);
    expect(state.protocolVersion).toBe(1);
    expect(state.micLevel).toBe(0.12);
    expect(state.settings).toEqual({
      activationMode: "push-to-talk",
      personalDictionary: ["Input Assist"],
    });
    expect(state.apiKey).toBe("[REDACTED_API_KEY]");
  });
});
