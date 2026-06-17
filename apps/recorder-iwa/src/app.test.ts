import { describe, expect, it, vi } from "vitest";
import { createRecorderApp } from "./app.js";
import { DEFAULT_RECORDER_SETTINGS } from "./settings/store.js";

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

  it("does not show partial transcript in ui when disabled in settings", async () => {
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
      socketFactory: (handlers) => {
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
        getItem: () =>
          JSON.stringify({
            showPartialTranscript: false,
          }),
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

    socketHandlers?.onPartial("hello");
    expect(app.ui.getModel().partialText).toBe("");
    expect(
      outbound.some((message) => (message as { type: string }).type === "PARTIAL_TRANSCRIPT"),
    ).toBe(true);
  });

  it("merges SETTINGS_UPDATED without exposing api keys", async () => {
    const storage = {
      data: JSON.stringify({ ...DEFAULT_RECORDER_SETTINGS, elevenLabsApiKey: "sk_secret" }),
      getItem() {
        return this.data;
      },
      setItem(_key: string, value: string) {
        this.data = value;
      },
    };

    const inbound: Array<(message: unknown) => void> = [];
    const port = {
      postMessage: () => {},
      onMessage: {
        addListener: (listener: (message: unknown) => void) => inbound.push(listener),
        removeListener: vi.fn(),
      },
    };

    const app = createRecorderApp({
      extensionId: "ext-1",
      createPort: () => port,
      socketFactory: () => ({
        connect: async () => {},
        sendAudio: () => {},
        stop: async () => {},
        cancel: () => {},
        shouldReconnect: () => false,
      }),
      storage,
    });

    app.bridgeClient.connectBridge();

    for (const listener of inbound) {
      listener({
        type: "SETTINGS_UPDATED",
        settings: { activationMode: "toggle" },
      });
    }

    expect(app.settings.load().activationMode).toBe("toggle");
    expect(app.settings.load().elevenLabsApiKey).toBe("sk_secret");
  });
});
