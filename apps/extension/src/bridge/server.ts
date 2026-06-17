import {
  isSessionIdMatch,
  isSessionScopedRecorderMessage,
  parseExtensionToRecorder,
  parseRecorderToExtension,
  type ExtensionToRecorderMessage,
  type RecorderToExtensionMessage,
} from "@input-assist/protocol";

export interface BridgePort {
  postMessage(message: unknown): void;
  onMessage: {
    addListener(listener: (message: unknown) => void): void;
    removeListener(listener: (message: unknown) => void): void;
  };
  onDisconnect: {
    addListener(listener: () => void): void;
  };
}

export interface ExtensionBridgeServerOptions {
  allowedOrigin: string;
  onRecorderMessage?: (message: RecorderToExtensionMessage) => void;
}

export class ExtensionBridgeServer {
  private readonly allowedOrigin: string;
  private readonly onRecorderMessage: (message: RecorderToExtensionMessage) => void;
  private port: BridgePort | null = null;
  private activeSessionId: string | null = null;

  constructor(options: ExtensionBridgeServerOptions) {
    this.allowedOrigin = options.allowedOrigin;
    this.onRecorderMessage = options.onRecorderMessage ?? (() => {});
  }

  connect(port: BridgePort, senderUrl: string): boolean {
    if (!senderUrl.startsWith(this.allowedOrigin)) {
      return false;
    }

    this.port = port;
    port.onMessage.addListener((message) => {
      const parsed = parseRecorderToExtension(message);
      if (parsed.type === "HELLO") {
        this.send({ type: "HELLO_ACK", protocolVersion: 1, extensionState: { recorderConnected: true } });
      }
      if (isSessionScopedRecorderMessage(parsed) && this.activeSessionId) {
        if (!isSessionIdMatch(parsed, this.activeSessionId)) {
          return;
        }
      }
      this.onRecorderMessage(parsed);
    });
    port.onDisconnect.addListener(() => {
      this.port = null;
    });
    return true;
  }

  startSession(sessionId: string, config: Extract<ExtensionToRecorderMessage, { type: "START_SESSION" }>["config"]): void {
    this.activeSessionId = sessionId;
    this.send({ type: "START_SESSION", sessionId, config });
  }

  stopSession(sessionId: string): void {
    this.send({ type: "STOP_SESSION", sessionId });
  }

  cancelSession(sessionId: string): void {
    this.send({ type: "CANCEL_SESSION", sessionId });
    this.activeSessionId = null;
  }

  isConnected(): boolean {
    return this.port !== null;
  }

  private send(message: ExtensionToRecorderMessage): void {
    this.port?.postMessage(message);
  }
}
