import type { DictationSessionConfig } from "@input-assist/protocol";
import type { RealtimeSocket } from "../asr/realtimeSocket.js";

export interface RecorderSessionHandlers {
  onPartial(text: string): void;
  onFinal(text: string): void;
  onError(message: string): void;
}

export class RecorderSessionController {
  private activeSessionId: string | null = null;
  private transcript = "";

  constructor(
    private readonly socketFactory: () => RealtimeSocket,
    private readonly handlers: RecorderSessionHandlers,
  ) {}

  async startSession(sessionId: string, _config: DictationSessionConfig): Promise<void> {
    this.activeSessionId = sessionId;
    this.transcript = "";
    const socket = this.socketFactory();
    await socket.connect();
  }

  appendPartial(text: string): void {
    this.handlers.onPartial(text);
  }

  appendCommitted(text: string): void {
    if (text.trim()) {
      this.transcript = this.transcript ? `${this.transcript} ${text.trim()}` : text.trim();
    }
  }

  stopSession(): string {
    const finalText = this.transcript;
    this.activeSessionId = null;
    this.transcript = "";
    this.handlers.onFinal(finalText);
    return finalText;
  }

  cancelSession(): void {
    this.activeSessionId = null;
    this.transcript = "";
  }

  getActiveSessionId(): string | null {
    return this.activeSessionId;
  }
}
