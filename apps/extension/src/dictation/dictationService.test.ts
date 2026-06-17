import { describe, expect, it, vi } from "vitest";
import { ExtensionBridgeServer } from "../bridge/server.js";
import { DictationService } from "./dictationService.js";
import { DEFAULT_DICTATION_CONFIG } from "@input-assist/dictation-core";

describe("DictationService.applySharedSettings", () => {
  it("updates activation mode for the next recorder session", async () => {
    const sent: unknown[] = [];
    const bridge = new ExtensionBridgeServer({
      allowedOrigin: "isolated-app://abc",
      onRecorderMessage: () => {},
    });
    const port = {
      postMessage: (message: unknown) => sent.push(message),
      onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
      onDisconnect: { addListener: vi.fn() },
    };
    bridge.connect(port, "isolated-app://abc/");

    const service = new DictationService({
      bridge,
      launcher: { launch: async () => {} },
      imeAdapter: {
        hasValidContext: () => true,
        getContextType: () => "text",
        getContextId: () => 1,
        commitText: async () => true,
        deleteSurroundingText: async () => true,
      },
      dictationConfig: DEFAULT_DICTATION_CONFIG,
      sessionConfig: {
        activationMode: "push-to-talk",
        languageHint: "auto",
        spokenPunctuation: true,
        appendSpace: false,
      },
      isDictationAllowed: () => true,
      createSessionId: () => "sess-1",
    });

    service.applySharedSettings({ activationMode: "toggle", languageHint: "fi" });
    await service.onDictationChordDown();

    const startMessage = sent.find(
      (message) => (message as { type: string }).type === "START_SESSION",
    ) as {
      config: { activationMode: string; languageHint: string };
    };

    expect(startMessage.config).toEqual({
      activationMode: "toggle",
      languageHint: "fi",
      spokenPunctuation: true,
      appendSpace: false,
    });
  });
});
