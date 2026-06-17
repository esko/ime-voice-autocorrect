import { buildWorkletSource } from "./pcmWorklet.js";

export const SAMPLE_RATE = 16_000;

export interface AudioPipelineConfig {
  inputDeviceId?: string;
  noiseGate: boolean;
}

export interface AudioPipelineHandlers {
  onFrame(samples: Float32Array): void;
  onLevel(level: number): void;
}

export interface AudioCaptureDeps {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  createAudioContext(options?: AudioContextOptions): AudioContext;
  createBlob(parts: BlobPart[], options?: BlobPropertyBag): Blob;
  createObjectURL(object: Blob): string;
  revokeObjectURL(url: string): void;
}

const defaultDeps: AudioCaptureDeps = {
  getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
  createAudioContext: (options) => new AudioContext(options),
  createBlob: (parts, options) => new Blob(parts, options),
  createObjectURL: (object) => URL.createObjectURL(object),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
};

export class AudioPipeline {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private workletUrl: string | null = null;
  private muted = false;

  constructor(private readonly deps: AudioCaptureDeps = defaultDeps) {}

  static isSupported(): boolean {
    return Boolean(
      typeof AudioWorkletNode !== "undefined" && navigator?.mediaDevices?.getUserMedia,
    );
  }

  async start(config: AudioPipelineConfig, handlers: AudioPipelineHandlers): Promise<void> {
    this.muted = false;

    const stream = await this.deps.getUserMedia({
      audio: {
        deviceId: config.inputDeviceId ? { exact: config.inputDeviceId } : undefined,
        channelCount: 1,
        sampleRate: SAMPLE_RATE,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    this.mediaStream = stream;

    const audioContext = this.deps.createAudioContext({ sampleRate: SAMPLE_RATE });
    this.audioContext = audioContext;
    const source = audioContext.createMediaStreamSource(stream);

    const blob = this.deps.createBlob([buildWorkletSource(config.noiseGate)], {
      type: "application/javascript",
    });
    this.workletUrl = this.deps.createObjectURL(blob);
    await audioContext.audioWorklet.addModule(this.workletUrl);

    const workletNode = new AudioWorkletNode(audioContext, "pcm-processor");
    this.workletNode = workletNode;
    workletNode.port.onmessage = ({ data }: MessageEvent<{ level?: number; samples?: Float32Array }>) => {
      if (typeof data.level === "number") {
        handlers.onLevel(data.level);
        return;
      }
      if (this.muted || !data.samples) {
        return;
      }
      handlers.onFrame(data.samples);
    };

    source.connect(workletNode);
    workletNode.connect(audioContext.destination);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  stop(): void {
    this.muted = true;
    if (this.workletNode) {
      this.workletNode.port.onmessage = null;
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
      this.mediaStream = null;
    }
    if (this.workletUrl) {
      this.deps.revokeObjectURL(this.workletUrl);
      this.workletUrl = null;
    }
  }
}
