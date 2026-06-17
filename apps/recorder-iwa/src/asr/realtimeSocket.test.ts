import { describe, expect, it, vi } from "vitest";
import { RealtimeSocket } from "./realtimeSocket.js";

describe("RealtimeSocket", () => {
  it("waits for session started before sending audio", async () => {
    const sent: string[] = [];
    const listeners: Record<string, Array<(event: { data?: string }) => void>> = {};
    const socket = {
      readyState: 1,
      send: (data: string) => sent.push(data),
      close: vi.fn(),
      addEventListener: (type: string, listener: (event: { data?: string }) => void) => {
        listeners[type] = listeners[type] ?? [];
        listeners[type].push(listener);
      },
    };

    const onSessionStarted = vi.fn();
    const client = new RealtimeSocket({
      fetchToken: async () => "token",
      createWebSocket: () => socket,
      handlers: {
        onSessionStarted,
        onPartial: vi.fn(),
        onCommitted: vi.fn(),
        onError: vi.fn(),
      },
    });

    await client.connect();
    client.sendAudio("abc");
    expect(sent).toHaveLength(0);

    listeners.message?.[0]?.({
      data: JSON.stringify({ message_type: "session_started" }),
    });
    expect(onSessionStarted).toHaveBeenCalledOnce();

    client.sendAudio("abc");
    expect(sent).toHaveLength(1);
  });

  it("does not reconnect after user stop", async () => {
    const client = new RealtimeSocket({
      fetchToken: async () => "token",
      createWebSocket: () => ({
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
        addEventListener: vi.fn(),
      }),
      handlers: {
        onSessionStarted: vi.fn(),
        onPartial: vi.fn(),
        onCommitted: vi.fn(),
        onError: vi.fn(),
      },
    });

    await client.connect();
    await client.stop();
    expect(client.shouldReconnect()).toBe(false);
  });
});
