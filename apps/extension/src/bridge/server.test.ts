import { describe, expect, it, vi } from "vitest";
import { ExtensionBridgeServer } from "./server.js";
import { createDictationController } from "../dictation/controller.js";

describe("ExtensionBridgeServer", () => {
  it("rejects unknown origins", () => {
    const server = new ExtensionBridgeServer({ allowedOrigin: "isolated-app://abc" });
    const port = createPort();
    expect(server.connect(port, "isolated-app://evil")).toBe(false);
  });

  it("responds to HELLO with HELLO_ACK", () => {
    const port = createPort();
    const server = new ExtensionBridgeServer({ allowedOrigin: "isolated-app://abc" });
    server.connect(port, "isolated-app://abc/");

    port.emit({
      type: "HELLO",
      protocolVersion: 1,
      appId: "input-assist-recorder",
    });

    expect(port.sent.at(-1)).toEqual({
      type: "HELLO_ACK",
      protocolVersion: 1,
      extensionState: { recorderConnected: true },
    });
  });
});

describe("dictation bridge integration", () => {
  it("commits final transcript after push-to-talk release", async () => {
    const port = createPort();
    const bridge = new ExtensionBridgeServer({ allowedOrigin: "isolated-app://abc" });
    bridge.connect(port, "isolated-app://abc/");
    const commits: string[] = [];

    const session = createDictationController({
      bridge,
      ime: {
        hasValidContext: () => true,
        commitText: async (text) => {
          commits.push(text);
          return true;
        },
      },
    });

    session.onDictationChordDown();
    session.onDictationChordUp();
    await vi.waitUntil(() => commits.length === 1);

    expect(commits[0]).toBe("dictated text");
    expect(port.sent.some((message) => message.type === "START_SESSION")).toBe(true);
    expect(port.sent.some((message) => message.type === "STOP_SESSION")).toBe(true);
  });
});

function createPort() {
  const listeners: Array<(message: unknown) => void> = [];
  const sent: Array<{ type: string }> = [];
  return {
    sent,
    postMessage(message: unknown) {
      sent.push(message as { type: string });
    },
    onMessage: {
      addListener(listener: (message: unknown) => void) {
        listeners.push(listener);
      },
      removeListener: vi.fn(),
    },
    onDisconnect: { addListener: vi.fn() },
    emit(message: unknown) {
      listeners.forEach((listener) => listener(message));
    },
  };
}
