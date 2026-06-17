import { describe, expect, it, vi } from "vitest";
import { RecorderSessionController } from "./recorderSession.js";
import type { RealtimeSocket, RealtimeSocketHandlers } from "../asr/realtimeSocket.js";

const sessionConfig = {
  activationMode: "push-to-talk" as const,
  languageHint: "auto" as const,
  spokenPunctuation: true,
  appendSpace: false,
};

describe("RecorderSessionController", () => {
  it("accumulates committed chunks and returns one final transcript on stop", async () => {
    const finals: string[] = [];
    let socketHandlers: RealtimeSocketHandlers | null = null;
    const controller = new RecorderSessionController(
      (handlers) => {
        socketHandlers = handlers;
        return {
          connect: async () => {
            handlers.onSessionStarted();
          },
          sendAudio: () => {},
          stop: async () => {},
          cancel: () => {},
          shouldReconnect: () => false,
        } satisfies RealtimeSocket;
      },
      {
        onPartial: () => {},
        onFinal: (text) => finals.push(text),
        onError: () => {},
      },
    );

    await controller.startSession("sess-1", sessionConfig);
    socketHandlers?.onCommitted("hello");
    socketHandlers?.onCommitted("world");
    await controller.stopSession();

    expect(finals).toEqual(["hello world"]);
  });

  it("forwards partial transcripts from the asr socket", async () => {
    const partials: string[] = [];
    let socketHandlers: RealtimeSocketHandlers | null = null;
    const controller = new RecorderSessionController(
      (handlers) => {
        socketHandlers = handlers;
        return {
          connect: async () => {},
          sendAudio: vi.fn(),
          stop: async () => {},
          cancel: vi.fn(),
          shouldReconnect: () => false,
        } satisfies RealtimeSocket;
      },
      {
        onPartial: (text) => partials.push(text),
        onFinal: () => {},
        onError: () => {},
      },
    );

    await controller.startSession("sess-1", sessionConfig);
    socketHandlers?.onPartial("hel");

    expect(partials).toEqual(["hel"]);
  });

  it("streams captured audio frames to the asr socket", async () => {
    const sendAudio = vi.fn();
    let workletHandler: ((event: MessageEvent) => void) | null = null;

    class MockAudioWorkletNode {
      port = { onmessage: null as ((event: MessageEvent) => void) | null };
      connect = vi.fn();
      disconnect = vi.fn();
      constructor() {
        workletHandler = (event) => this.port.onmessage?.(event);
      }
    }

    vi.stubGlobal(
      "AudioWorkletNode",
      MockAudioWorkletNode as unknown as typeof AudioWorkletNode,
    );

    const controller = new RecorderSessionController(
      (handlers) => ({
        connect: async () => {
          handlers.onSessionStarted();
        },
        sendAudio,
        stop: async () => {},
        cancel: () => {},
        shouldReconnect: () => false,
      }),
      {
        onPartial: () => {},
        onFinal: () => {},
        onError: () => {},
        onAudioLevel: () => {},
      },
      () => ({
        start: async (_config, handlers) => {
          workletHandler = (event: MessageEvent) => {
            if (typeof (event.data as { level?: number }).level === "number") {
              handlers.onLevel((event.data as { level: number }).level);
              return;
            }
            handlers.onFrame((event.data as { samples: Float32Array }).samples);
          };
        },
        setMuted: vi.fn(),
        stop: vi.fn(),
      }),
    );

    await controller.startSession("sess-1", sessionConfig);
    workletHandler?.({ data: { samples: new Float32Array([0.5, -0.5]) } } as MessageEvent);

    expect(sendAudio).toHaveBeenCalledOnce();
  });
});
