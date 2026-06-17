import { describe, expect, it, vi } from "vitest";
import { AudioPipeline } from "./audioPipeline.js";

describe("AudioPipeline", () => {
  it("emits mic frames and levels from the worklet", async () => {
    const frames: Float32Array[] = [];
    const levels: number[] = [];
    let workletHandler: ((event: MessageEvent) => void) | null = null;

    const deps = {
      getUserMedia: vi.fn(async () => ({
        getTracks: () => [{ stop: vi.fn() }],
      })),
      createAudioContext: vi.fn(() => ({
        createMediaStreamSource: vi.fn(() => ({ connect: vi.fn() })),
        audioWorklet: { addModule: vi.fn(async () => {}) },
        destination: {},
        close: vi.fn(async () => {}),
      })),
      createBlob: vi.fn((parts: BlobPart[]) => ({ parts })),
      createObjectURL: vi.fn(() => "blob:worklet"),
      revokeObjectURL: vi.fn(),
    };

    class MockAudioWorkletNode {
      port = {
        onmessage: null as ((event: MessageEvent) => void) | null,
      };
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

    const pipeline = new AudioPipeline(deps);
    await pipeline.start({ noiseGate: false }, {
      onFrame: (samples) => frames.push(samples),
      onLevel: (level) => levels.push(level),
    });

    workletHandler?.({ data: { level: 0.42 } } as MessageEvent);
    workletHandler?.({ data: { samples: new Float32Array([0.1, 0.2]) } } as MessageEvent);

    expect(levels).toEqual([0.42]);
    expect(frames).toHaveLength(1);
    expect(frames[0]?.length).toBe(2);

    pipeline.setMuted(true);
    workletHandler?.({ data: { samples: new Float32Array([0.3]) } } as MessageEvent);
    expect(frames).toHaveLength(1);

    pipeline.stop();
    expect(deps.revokeObjectURL).toHaveBeenCalledWith("blob:worklet");
  });
});
