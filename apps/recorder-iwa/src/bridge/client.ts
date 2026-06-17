import { parseExtensionToRecorder, parseRecorderToExtension } from "@input-assist/protocol";

export interface BridgePort {
  postMessage(message: unknown): void;
  onMessage: {
    addListener(listener: (message: unknown) => void): void;
    removeListener(listener: (message: unknown) => void): void;
  };
}

export interface BridgeClientOptions {
  extensionId: string;
  appId: string;
  connect: (extensionId: string) => BridgePort;
  onReady?: () => void;
}

export class RecorderBridgeClient {
  private readonly extensionId: string;
  private readonly appId: string;
  private readonly connect: BridgeClientOptions["connect"];
  private readonly onReady: () => void;
  private port: BridgePort | null = null;

  constructor(options: BridgeClientOptions) {
    this.extensionId = options.extensionId;
    this.appId = options.appId;
    this.connect = options.connect;
    this.onReady = options.onReady ?? (() => {});
  }

  connectBridge(): void {
    this.port = this.connect(this.extensionId);
    this.port.postMessage(
      parseRecorderToExtension({
        type: "HELLO",
        protocolVersion: 1,
        appId: this.appId,
      }),
    );
    this.port.onMessage.addListener((message) => {
      const parsed = parseExtensionToRecorder(message);
      if (parsed.type === "HELLO_ACK") {
        this.onReady();
      }
      if (parsed.type === "PING") {
        this.port?.postMessage({ type: "PONG", id: parsed.id });
      }
    });
  }

  isConnected(): boolean {
    return this.port !== null;
  }
}
