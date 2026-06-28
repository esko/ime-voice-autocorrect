import { DEFAULT_DICTATION_CONFIG, type DictationConfig } from "./config.js";
import type {
  ImeTextPort,
  LoggerPort,
  RecorderPort,
  RecorderStatusPort,
  StreamHandlers,
  ContextToken,
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

type DictationTarget =
  | { kind: "valid-context"; token: ContextToken; startedAt: number }
  | { kind: "no-target" };

export class DictationSession {
  private readonly ime: ImeTextPort;
  private readonly recorder: RecorderPort;
  private readonly status: RecorderStatusPort;
  private readonly logger: LoggerPort;
  private config: DictationConfig;
  private readonly createSessionId: () => string;
  private readonly buffer = new TranscriptBuffer();

  private running = false;
  private starting = false;
  private keyHeld = false;
  private sessionId: string | null = null;
  private target: DictationTarget = { kind: "no-target" };

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

  updateConfig(config: Partial<DictationConfig>): void {
    this.config = { ...this.config, ...config };
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
    // Optionally cancel. But we let `finalize` check the target validity anyway.
    // If blur invalidates original delivery target, we should still stop and reject.
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

    const token = this.ime.getContextToken();
    if (token === null) {
      this.target = { kind: "no-target" };
    } else {
      this.target = { kind: "valid-context", token, startedAt: Date.now() };
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
        if (!this.running) return;
        this.status.setPartial(formatPartialTranscript(text, this.config));
      },
      onCommitted: (text) => {
        if (!this.running) return;
        if (detectScratchThat(text)) {
          this.buffer.scratchThat();
          this.status.setPartial("");
          return;
        }
        this.buffer.append(text);
        this.status.setPartial("");
      },
      onError: (message) => {
        if (!this.running) return;
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
      
      if (transcript) {
        if (this.target.kind === "valid-context" && this.ime.hasValidContext(this.target.token)) {
          await this.ime.commitText(transcript, this.target.token);
        } else {
          this.logger.warn("Undeliverable transcript: no valid target context");
        }
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
