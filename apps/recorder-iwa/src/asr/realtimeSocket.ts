import type { DictationSessionConfig } from "@input-assist/protocol";
import { decodeRealtimeMessage } from "./realtimeProtocol.js";
import { buildRealtimeWebSocketUrl } from "./createRealtimeSocket.js";
import type { LanguageHint } from "./createRealtimeSocket.js";
import { float32ToPcm16, pcm16ToBase64 } from "./pcmUtils.js";

export interface RealtimeSocketHandlers {
  onSessionStarted(): void;
  onPartial(text: string): void;
  onCommitted(text: string): void;
  onError(detail: string): void;
}

export interface RealtimeSocketOptions {
  createWebSocket: (url: string) => WebSocketLike;
  fetchToken: () => Promise<string>;
  getLanguageHint: () => LanguageHint;
  handlers: RealtimeSocketHandlers;
}

export interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  addEventListener(type: "message" | "close", listener: (event: { data?: string }) => void): void;
}

const OPEN = 1;

export class RealtimeSocket {
  private readonly createWebSocket: RealtimeSocketOptions["createWebSocket"];
  private readonly fetchToken: RealtimeSocketOptions["fetchToken"];
  private readonly getLanguageHint: RealtimeSocketOptions["getLanguageHint"];
  private readonly handlers: RealtimeSocketHandlers;
  private socket: WebSocketLike | null = null;
  private sessionReady = false;
  private userStopped = false;

  constructor(options: RealtimeSocketOptions) {
    this.createWebSocket = options.createWebSocket;
    this.fetchToken = options.fetchToken;
    this.getLanguageHint = options.getLanguageHint;
    this.handlers = options.handlers;
  }

  async connect(): Promise<void> {
    const token = await this.fetchToken();
    const url = buildRealtimeWebSocketUrl(token, this.getLanguageHint());
    this.socket = this.createWebSocket(url);
    this.socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") {
        return;
      }
      const decoded = decodeRealtimeMessage(event.data);
      switch (decoded.type) {
        case "sessionStarted":
          this.sessionReady = true;
          this.handlers.onSessionStarted();
          break;
        case "partial":
          this.handlers.onPartial(decoded.text);
          break;
        case "committed":
          this.handlers.onCommitted(decoded.text);
          break;
        case "error":
          this.handlers.onError(decoded.detail);
          break;
        default:
          break;
      }
    });
  }

  sendAudio(base64Chunk: string): void {
    if (!this.sessionReady || !this.socket || this.socket.readyState !== OPEN) {
      return;
    }
    this.socket.send(
      JSON.stringify({ message_type: "input_audio_chunk", audio_base_64: base64Chunk }),
    );
  }

  sendPcmFrame(samples: Float32Array): void {
    this.sendAudio(pcm16ToBase64(float32ToPcm16(samples)));
  }

  async stop(): Promise<void> {
    this.userStopped = true;
    this.socket?.send(JSON.stringify({ message_type: "input_audio_chunk", commit: true }));
  }

  cancel(): void {
    this.userStopped = true;
    this.socket?.close();
    this.socket = null;
    this.sessionReady = false;
  }

  shouldReconnect(): boolean {
    return !this.userStopped;
  }
}
