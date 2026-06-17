import { describe, expect, it, vi } from "vitest";
import { ExtensionBridgeServer } from "../bridge/server.js";
import { BridgeRecorderPort } from "./bridgeRecorderPort.js";

describe("BridgeRecorderPort", () => {
  it("waits for final transcript after stop", async () => {
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

    const recorder = new BridgeRecorderPort(bridge, {
      activationMode: "push-to-talk",
      languageHint: "auto",
      spokenPunctuation: true,
      appendSpace: false,
    });

    const committed: string[] = [];
    await recorder.start("sess-1", {
      onPartial: vi.fn(),
      onCommitted: (text) => committed.push(text),
      onError: vi.fn(),
      onClose: vi.fn(),
    });

    const stopPromise = recorder.stop();
    recorder.onFinalTranscript("hello from recorder");
    await stopPromise;

    expect(committed).toEqual(["hello from recorder"]);
    expect(sent.some((message) => (message as { type: string }).type === "STOP_SESSION")).toBe(
      true,
    );
  });

  it("uses updated session config on the next start", async () => {
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

    const recorder = new BridgeRecorderPort(bridge, {
      activationMode: "push-to-talk",
      languageHint: "auto",
      spokenPunctuation: true,
      appendSpace: false,
    });
    recorder.updateSessionConfig({
      activationMode: "toggle",
      languageHint: "fi",
      spokenPunctuation: false,
      appendSpace: true,
    });

    await recorder.start("sess-1", {
      onPartial: vi.fn(),
      onCommitted: vi.fn(),
      onError: vi.fn(),
      onClose: vi.fn(),
    });

    expect(sent[0]).toEqual({
      type: "START_SESSION",
      sessionId: "sess-1",
      config: {
        activationMode: "toggle",
        languageHint: "fi",
        spokenPunctuation: false,
        appendSpace: true,
      },
    });
  });
});
