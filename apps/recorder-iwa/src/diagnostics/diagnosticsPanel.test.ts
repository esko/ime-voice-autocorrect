import { describe, expect, it } from "vitest";
import { copyDiagnosticsBundle } from "./diagnosticsPanel.js";

describe("copyDiagnosticsBundle", () => {
  it("copies a redacted debug bundle", async () => {
    let copied = "";

    await copyDiagnosticsBundle({
      getState: () => ({
        bridgeConnected: true,
        protocolVersion: 1,
        lastAsrError: "network",
        micLevel: 0.5,
        settings: { activationMode: "toggle" },
        apiKey: "sk_live_secret",
      }),
      copyText: async (text) => {
        copied = text;
      },
    });

    expect(copied).toContain('"bridgeConnected": true');
    expect(copied).toContain("[REDACTED_API_KEY]");
    expect(copied).not.toContain("sk_live_secret");
  });
});
