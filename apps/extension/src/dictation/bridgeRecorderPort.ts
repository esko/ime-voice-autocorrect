import type { StreamHandlers } from "@input-assist/dictation-core";
import type { DictationSessionConfig } from "@input-assist/protocol";
import type { ExtensionBridgeServer } from "../bridge/server.js";

export class BridgeRecorderPort {
  private handlers: StreamHandlers | null = null;
  private stopResolve: (() => void) | null = null;
  private sessionId: string | null = null;

  constructor(
    private readonly bridge: ExtensionBridgeServer,
    private config: DictationSessionConfig,
  ) {}

  updateSessionConfig(config: DictationSessionConfig): void {
    this.config = config;
  }

  async start(sessionId: string, handlers: StreamHandlers): Promise<void> {
    this.sessionId = sessionId;
    this.handlers = handlers;
    this.bridge.startSession(sessionId, this.config);
  }

  async stop(): Promise<void> {
    if (!this.sessionId) {
      return;
    }
    await new Promise<void>((resolve) => {
      this.stopResolve = resolve;
      this.bridge.stopSession(this.sessionId!);
    });
  }

  cancel(): void {
    if (this.sessionId) {
      this.bridge.cancelSession(this.sessionId);
    }
    this.handlers = null;
    this.sessionId = null;
    this.stopResolve = null;
  }

  onPartial(text: string): void {
    this.handlers?.onPartial(text);
  }

  onCommittedTranscript(text: string): void {
    this.handlers?.onCommitted(text);
  }

  onSessionClosed(): void {
    if (this.stopResolve) {
      this.stopResolve();
      this.stopResolve = null;
    }
  }

  onError(message: string): void {
    this.handlers?.onError(message);
  }
}
