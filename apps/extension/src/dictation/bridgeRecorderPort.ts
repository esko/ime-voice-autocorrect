import type { StreamHandlers } from "@input-assist/dictation-core";
import type { DictationSessionConfig } from "@input-assist/protocol";
import type { ExtensionBridgeServer } from "../bridge/server.js";

export class BridgeRecorderPort {
  private handlers: StreamHandlers | null = null;
  private stopResolve: ((text: string) => void) | null = null;
  private sessionId: string | null = null;

  constructor(
    private readonly bridge: ExtensionBridgeServer,
    private readonly config: DictationSessionConfig,
  ) {}

  async start(sessionId: string, handlers: StreamHandlers): Promise<void> {
    this.sessionId = sessionId;
    this.handlers = handlers;
    this.bridge.startSession(sessionId, this.config);
  }

  async stop(): Promise<void> {
    if (!this.sessionId) {
      return;
    }
    const finalText = await new Promise<string>((resolve) => {
      this.stopResolve = resolve;
      this.bridge.stopSession(this.sessionId!);
    });
    this.handlers?.onCommitted(finalText);
    this.stopResolve = null;
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

  onFinalTranscript(text: string): void {
    if (this.stopResolve) {
      this.stopResolve(text);
      this.stopResolve = null;
      return;
    }
    this.handlers?.onCommitted(text);
  }

  onError(message: string): void {
    this.handlers?.onError(message);
  }
}
