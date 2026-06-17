import type { DictationSessionConfig } from "@input-assist/protocol";
import type { AudioPipeline, AudioPipelineConfig } from "../audio/audioPipeline.js";
import { float32ToPcm16, pcm16ToBase64 } from "../asr/pcmUtils.js";
import type { RealtimeSocket, RealtimeSocketHandlers } from "../asr/realtimeSocket.js";

export interface RecorderSessionHandlers {
  onPartial(text: string): void;
  onCommitted(text: string): void;
  onError(message: string): void;
  onAudioLevel?(level: number): void;
}

export type RealtimeSocketFactory = (
  handlers: RealtimeSocketHandlers,
  config: DictationSessionConfig,
) => RealtimeSocket;
export type AudioPipelineFactory = () => AudioPipeline;

export class RecorderSessionController {
  private activeSessionId: string | null = null;
  private socket: RealtimeSocket | null = null;
  private audioPipeline: AudioPipeline | null = null;

  constructor(
    private readonly socketFactory: RealtimeSocketFactory,
    private readonly handlers: RecorderSessionHandlers,
    private readonly audioPipelineFactory?: AudioPipelineFactory,
    private readonly getAudioConfig?: () => AudioPipelineConfig,
  ) {}

  async startSession(sessionId: string, config: DictationSessionConfig): Promise<void> {
    this.activeSessionId = sessionId;
    this.socket = this.socketFactory(
      {
        onSessionStarted: () => {},
        onPartial: (text) => {
          this.handlers.onPartial(text);
        },
        onCommitted: (text) => {
          this.handlers.onCommitted(text);
        },
      onError: (message) => {
        this.handlers.onError(message);
      },
      onFatal: (message) => {
        this.handlers.onError(message);
      },
      },
      config,
    );
    await this.socket.connect();

    if (this.audioPipelineFactory) {
      this.audioPipeline = this.audioPipelineFactory();
      await this.audioPipeline.start(this.getAudioConfig?.() ?? { noiseGate: true }, {
        onFrame: (samples) => {
          const pcm = float32ToPcm16(samples);
          this.socket?.sendAudio(pcm16ToBase64(pcm));
        },
        onLevel: (level) => {
          this.handlers.onAudioLevel?.(level);
        },
      });
    }
  }



  async stopSession(): Promise<void> {
    this.audioPipeline?.setMuted(true);
    await this.socket?.stop();
    this.audioPipeline?.stop();
    this.audioPipeline = null;

    this.activeSessionId = null;
    this.socket = null;
  }

  cancelSession(): void {
    this.audioPipeline?.stop();
    this.audioPipeline = null;
    this.socket?.cancel();
    this.activeSessionId = null;
    this.socket = null;
  }

  getActiveSessionId(): string | null {
    return this.activeSessionId;
  }
}
