import { DEFAULT_DICTATION_CONFIG, type DictationConfig } from "./config.js";
import type {
  ImeTextPort,
  LoggerPort,
  RecorderPort,
  RecorderStatusPort,
  StreamHandlers,
} from "./ports.js";
import { TranscriptBuffer } from "./transcriptBuffer.js";
import { detectScratchThat, formatFinalTranscript, formatPartialTranscript } from "./transcriptFormatter.js";

export interface DictationSessionDeps {
  ime: ImeTextPort;
  recorder: RecorderPort;
  status: RecorderStatusPort;
  logger: LoggerPort;
  config?: DictationConfig;
  createSessionId?: () => string;
}

export class DictationSession {
  private readonly ime: ImeTextPort;
  private readonly recorder: RecorderPort;
  private readonly status: RecorderStatusPort;
  private readonly logger: LoggerPort;
  private readonly config: DictationConfig;
  private readonly createSessionId: () => string;
  private readonly buffer = new TranscriptBuffer();

  private running = false;
  private starting = false;
  private keyHeld = false;
  private sessionId: string | null = null;

  constructor(deps: DictationSessionDeps) {
    this.ime = deps.ime;
    this.recorder = deps.recorder;
    this.status = deps.status;
    this.logger = deps.logger;
    this.config = deps.config ?? DEFAULT_DICTATION_CONFIG;
    this.createSessionId = deps.createSessionId ?? (() => crypto.randomUUID());
  }

  isRunning(): boolean {
    return this.running;
  }

  onDictationChordDown(): void {
    if (this.keyHeld) {
      return;
    }
    this.keyHeld = true;

    if (this.config.activationMode === "push-to-talk") {
      if (!this.running) {
        void this.start();
      }
      return;
    }

    void this.toggle();
  }

  onDictationChordUp(): void {
    this.keyHeld = false;
    if (this.config.activationMode === "push-to-talk" && this.running) {
      void this.finalize();
    }
  }

  onEscape(): void {
    if (this.running) {
      this.cancel();
    }
  }

  onContextLost(): void {
    if (this.running) {
      this.cancel();
    }
  }

  private async toggle(): Promise<void> {
    if (this.running) {
      await this.finalize();
      return;
    }
    await this.start();
  }

  private async start(): Promise<void> {
    if (this.running || this.starting) {
      return;
    }
    if (!this.ime.hasValidContext()) {
      this.logger.warn("No valid IME context");
      return;
    }

    this.starting = true;
    try {
      this.sessionId = this.createSessionId();
      this.buffer.reset();
      this.running = true;
      this.status.show("Listening", { busy: true });
      await this.recorder.start(this.sessionId, this.createHandlers());
    } catch (error) {
      this.handleError(error);
    } finally {
      this.starting = false;
    }
  }

  private createHandlers(): StreamHandlers {
    return {
      onPartial: (text) => {
        this.status.setPartial(formatPartialTranscript(text, this.config));
      },
      onCommitted: (text) => {
        if (detectScratchThat(text)) {
          this.buffer.scratchThat();
          this.status.setPartial("");
          return;
        }
        this.buffer.append(text);
        this.status.setPartial("");
      },
      onError: (message) => {
        this.handleError(new Error(message));
      },
      onClose: () => {
        if (this.running) {
          this.cancel();
        }
      },
    };
  }

  private async finalize(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      await this.recorder.stop();
      const transcript = formatFinalTranscript(this.buffer.toText(), this.config);
      if (transcript && this.ime.hasValidContext()) {
        await this.ime.commitText(transcript);
      }
    } catch (error) {
      this.handleError(error);
      return;
    } finally {
      this.reset();
    }
  }

  cancel(): void {
    this.recorder.cancel();
    this.reset();
  }

  private reset(): void {
    this.running = false;
    this.sessionId = null;
    this.buffer.reset();
    this.status.setPartial("");
    this.status.hide();
  }

  private handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(message);
    this.recorder.cancel();
    this.reset();
    this.status.show(message, { error: true });
  }
}
