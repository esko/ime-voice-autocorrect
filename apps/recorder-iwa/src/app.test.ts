import { describe, expect, it, vi } from "vitest";
import { createRecorderApp } from "./app.js";

describe("createRecorderApp", () => {
  it("handles start and stop session commands from the extension", async () => {
    const outbound: unknown[] = [];
    const inbound: Array<(message: unknown) => void> = [];
    const port = {
      postMessage: (message: unknown) => outbound.push(message),
      onMessage: {
        addListener: (listener: (message: unknown) => void) => inbound.push(listener),
        removeListener: vi.fn(),
      },
    };

    let socketHandlers: import("./asr/realtimeSocket.js").RealtimeSocketHandlers | null = null;

    const app = createRecorderApp({
      extensionId: "ext-1",
      createPort: () => port,
      socketFactory: (handlers, _config) => {
        socketHandlers = handlers;
        return {
          connect: async () => {},
          sendAudio: () => {},
          stop: async () => {},
          cancel: () => {},
          shouldReconnect: () => false,
        };
      },
      storage: {
        getItem: () => null,
        setItem: () => {},
      },
    });

    app.bridgeClient.connectBridge();

    for (const listener of inbound) {
      listener({
        type: "HELLO_ACK",
        protocolVersion: 1,
        extensionState: { recorderConnected: true },
      });
    }

    for (const listener of inbound) {
      listener({
        type: "START_SESSION",
        sessionId: "sess-1",
        config: {
          activationMode: "push-to-talk",
          languageHint: "auto",
          spokenPunctuation: true,
          appendSpace: false,
        },
      });
    }

    const controller = app.getSessionController();
    expect(controller).not.toBeNull();
    socketHandlers?.onCommitted("hello world");

    for (const listener of inbound) {
      listener({ type: "STOP_SESSION", sessionId: "sess-1" });
    }

    await Promise.resolve();

    expect(
      outbound.some((message) => (message as { type: string }).type === "FINAL_TRANSCRIPT"),
    ).toBe(true);
  });
});
