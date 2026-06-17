import { describe, expect, it, vi } from "vitest";
import { RecorderBridgeClient } from "./bridge/client.js";

describe("RecorderBridgeClient", () => {
  it("sends HELLO and resolves when HELLO_ACK arrives", () => {
    const listeners: Array<(message: unknown) => void> = [];
    const port = {
      postMessage: vi.fn(),
      onMessage: {
        addListener: (listener: (message: unknown) => void) => listeners.push(listener),
        removeListener: vi.fn(),
      },
    };
    const onReady = vi.fn();

    const client = new RecorderBridgeClient({
      extensionId: "ext-id",
      appId: "input-assist-recorder",
      connect: () => port,
      onReady,
    });

    client.connectBridge();
    expect(port.postMessage).toHaveBeenCalledWith({
      type: "HELLO",
      protocolVersion: 1,
      appId: "input-assist-recorder",
    });

    listeners[0]?.({
      type: "HELLO_ACK",
      protocolVersion: 1,
      extensionState: { recorderConnected: true },
    });
    expect(onReady).toHaveBeenCalledOnce();
    expect(client.isConnected()).toBe(true);
  });
});
