import { describe, expect, it, vi } from "vitest";
import { RecorderBridgeClient } from "./client.js";

describe("bridge heartbeat", () => {
  it("responds to extension ping with pong", () => {
    const listeners: Array<(message: unknown) => void> = [];
    const port = {
      postMessage: vi.fn(),
      onMessage: {
        addListener: (listener: (message: unknown) => void) => listeners.push(listener),
        removeListener: vi.fn(),
      },
    };

    const client = new RecorderBridgeClient({
      extensionId: "ext-1",
      appId: "input-assist-recorder",
      connect: () => port,
    });

    client.connectBridge();
    for (const listener of listeners) {
      listener({ type: "PING", id: "heartbeat-1" });
    }

    expect(port.postMessage).toHaveBeenCalledWith({ type: "PONG", id: "heartbeat-1" });
  });
});
