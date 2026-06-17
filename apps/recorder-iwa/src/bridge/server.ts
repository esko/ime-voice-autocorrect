import type { ExtensionToRecorderMessage } from "@input-assist/protocol";
import { parseExtensionToRecorder } from "@input-assist/protocol";

export interface RecorderBridgePort {
  postMessage(message: unknown): void;
  onMessage: {
    addListener(listener: (message: unknown) => void): void;
    removeListener(listener: (message: unknown) => void): void;
  };
}

export interface RecorderBridgeServerOptions {
  onExtensionMessage: (message: ExtensionToRecorderMessage) => void;
}

export class RecorderBridgeServer {
  private readonly onExtensionMessage: RecorderBridgeServerOptions["onExtensionMessage"];
  private port: RecorderBridgePort | null = null;

  constructor(options: RecorderBridgeServerOptions) {
    this.onExtensionMessage = options.onExtensionMessage;
  }

  attach(port: RecorderBridgePort): void {
    this.port = port;
    port.onMessage.addListener((message) => {
      this.onExtensionMessage(parseExtensionToRecorder(message));
    });
  }

  send(message: Parameters<RecorderBridgePort["postMessage"]>[0]): void {
    this.port?.postMessage(message);
  }
}
