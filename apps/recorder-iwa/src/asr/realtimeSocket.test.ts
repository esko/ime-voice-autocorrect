import { describe, expect, it, vi, afterEach } from "vitest";
import * as realtimeProtocol from "./realtimeProtocol.js";
import { RealtimeSocket } from "./realtimeSocket.js";

function createMockSocket() {
  const listeners: Record<string, Array<(event: { data?: string }) => void>> = {};
  const closeListeners: Array<() => void> = [];
  return {
    readyState: 1,
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: (
      type: string,
      listener: ((event: { data?: string }) => void) | (() => void),
    ) => {
      if (type === "close") {
        closeListeners.push(listener as () => void);
        return;
      }
      listeners[type] = listeners[type] ?? [];
      listeners[type].push(listener as (event: { data?: string }) => void);
    },
    emitMessage(data: string) {
      for (const listener of listeners.message ?? []) {
        listener({ data });
      }
    },
    emitClose() {
      for (const listener of closeListeners) {
        listener();
      }
    },
  };
}

async function connectSocket(
  client: RealtimeSocket,
  socket: ReturnType<typeof createMockSocket>,
): Promise<void> {
  const connectPromise = client.connect();
  await Promise.resolve();
  socket.emitMessage(JSON.stringify({ message_type: "session_started" }));
  await connectPromise;
}

describe("RealtimeSocket", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("waits for session started before sending audio", async () => {
    const socket = createMockSocket();
    const sent: string[] = [];
    socket.send = (data: string) => sent.push(data);

    const onSessionStarted = vi.fn();
    const client = new RealtimeSocket({
      fetchToken: async () => "token",
      getLanguageHint: () => "auto",
      createWebSocket: () => socket,
      handlers: {
        onSessionStarted,
        onPartial: vi.fn(),
        onCommitted: vi.fn(),
        onError: vi.fn(),
      },
    });

    await connectSocket(client, socket);
    client.sendAudio("abc");

    expect(sent).toHaveLength(1);
    expect(onSessionStarted).toHaveBeenCalledOnce();
  });

  it("does not reconnect after user stop", async () => {
    vi.useFakeTimers();
    const socket = createMockSocket();
    const createWebSocket = vi.fn(() => socket);
    const client = new RealtimeSocket({
      fetchToken: async () => "token",
      getLanguageHint: () => "auto",
      createWebSocket,
      handlers: {
        onSessionStarted: vi.fn(),
        onPartial: vi.fn(),
        onCommitted: vi.fn(),
        onError: vi.fn(),
      },
    });

    await connectSocket(client, socket);
    await client.stop();
    socket.emitClose();
    vi.advanceTimersByTime(5_000);

    expect(createWebSocket).toHaveBeenCalledTimes(1);
    expect(client.shouldReconnect()).toBe(false);
  });

  it("reconnects after a transient close", async () => {
    vi.useFakeTimers();
    const sockets: ReturnType<typeof createMockSocket>[] = [];
    const createWebSocket = vi.fn(() => {
      const nextSocket = createMockSocket();
      sockets.push(nextSocket);
      return nextSocket;
    });

    const client = new RealtimeSocket({
      fetchToken: async () => "token",
      getLanguageHint: () => "auto",
      createWebSocket,
      handlers: {
        onSessionStarted: vi.fn(),
        onPartial: vi.fn(),
        onCommitted: vi.fn(),
        onError: vi.fn(),
      },
    });

    const connectPromise = client.connect();
    await Promise.resolve();
    sockets[0]!.emitMessage(JSON.stringify({ message_type: "session_started" }));
    await connectPromise;
    sockets[0]?.emitClose();
    vi.advanceTimersByTime(400);
    await Promise.resolve();

    expect(createWebSocket).toHaveBeenCalledTimes(2);
  });

  it("reports a fatal error when reconnect attempts are exhausted", async () => {
    vi.useFakeTimers();
    vi.spyOn(realtimeProtocol, "reconnectDelay").mockImplementation((attempt) =>
      attempt === 0 ? 10 : null,
    );

    const socket = createMockSocket();
    let fetchCalls = 0;
    const onFatal = vi.fn();
    const client = new RealtimeSocket({
      fetchToken: async () => {
        fetchCalls += 1;
        if (fetchCalls > 1) {
          throw new Error("token fetch failed");
        }
        return "token";
      },
      getLanguageHint: () => "auto",
      createWebSocket: () => socket,
      handlers: {
        onSessionStarted: vi.fn(),
        onPartial: vi.fn(),
        onCommitted: vi.fn(),
        onError: vi.fn(),
        onFatal,
      },
    });

    await connectSocket(client, socket);
    socket.emitClose();
    await vi.advanceTimersByTimeAsync(10);

    expect(onFatal).toHaveBeenCalledOnce();
  });
});
