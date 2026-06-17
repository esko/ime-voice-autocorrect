import { describe, expect, it, vi } from "vitest";
import { ExtensionBridgeServer } from "./server.js";
import { createInputAssistApp } from "../ime/inputAssistApp.js";

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

  it("notifies when the recorder disconnects", () => {
    const onRecorderDisconnect = vi.fn();
    const port = createPort();
    const server = new ExtensionBridgeServer({
      allowedOrigin: "isolated-app://abc",
      onRecorderDisconnect,
    });
    server.connect(port, "isolated-app://abc/");
    port.disconnect();
    expect(onRecorderDisconnect).toHaveBeenCalledOnce();
  });
});

describe("end-to-end dictation bridge", () => {
  it("commits final transcript after push-to-talk release", async () => {
    const port = createPort();
    const commits: string[] = [];
    const app = createInputAssistApp({
      allowedOrigin: "isolated-app://abc",
      launchRecorder: async () => {},
      imeAdapter: {
        hasValidContext: () => true,
        getContextType: () => "text",
        getContextId: () => 1,
        commitText: async (text) => {
          commits.push(text);
          return true;
        },
        deleteSurroundingText: async () => true,
      },
      createSessionId: () => "sess-1",
    });

    app.bridge.connect(port, "isolated-app://abc/");
    port.emit({
      type: "HELLO",
      protocolVersion: 1,
      appId: "input-assist-recorder",
    });

    await app.dictation.onDictationChordDown();
    app.dictation.onDictationChordUp();
    port.emit({
      type: "COMMITTED_TRANSCRIPT",
      sessionId: "sess-1",
      text: "hello from recorder",
    });
    port.emit({
      type: "SESSION_CLOSED",
      sessionId: "sess-1",
      reason: "stopped",
    });
    await vi.waitUntil(() => commits.length === 1);

    expect(commits[0]).toBe("hello from recorder");
  });
});

function createPort() {
  const listeners: Array<(message: unknown) => void> = [];
  const disconnectListeners: Array<() => void> = [];
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
    onDisconnect: {
      addListener(listener: () => void) {
        disconnectListeners.push(listener);
      },
    },
    emit(message: unknown) {
      listeners.forEach((listener) => listener(message));
    },
    disconnect() {
      disconnectListeners.forEach((listener) => listener());
    },
  };
}
