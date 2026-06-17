import { decodeRealtimeMessage, reconnectDelay } from "./realtimeProtocol.js";
import { buildRealtimeWebSocketUrl } from "./createRealtimeSocket.js";
import type { LanguageHint } from "./createRealtimeSocket.js";
import { float32ToPcm16, pcm16ToBase64 } from "./pcmUtils.js";

export interface RealtimeSocketHandlers {
  onSessionStarted(): void;
  onPartial(text: string): void;
  onCommitted(text: string): void;
  onError(detail: string): void;
  onFatal?(detail: string): void;
}

export interface RealtimeSocketOptions {
  createWebSocket: (url: string) => WebSocketLike;
  fetchToken: () => Promise<string>;
  getLanguageHint: () => LanguageHint;
  handlers: RealtimeSocketHandlers;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
}

export interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  addEventListener(
    type: "message" | "close",
    listener: ((event: { data?: string }) => void) | (() => void),
  ): void;
}

const OPEN = 1;

export class RealtimeSocket {
  private readonly createWebSocket: RealtimeSocketOptions["createWebSocket"];
  private readonly fetchToken: RealtimeSocketOptions["fetchToken"];
  private readonly getLanguageHint: RealtimeSocketOptions["getLanguageHint"];
  private readonly handlers: RealtimeSocketHandlers;
  private readonly setTimer: typeof setTimeout;
  private readonly clearTimer: typeof clearTimeout;
  private socket: WebSocketLike | null = null;
  private sessionReady = false;
  private userStopped = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: RealtimeSocketOptions) {
    this.createWebSocket = options.createWebSocket;
    this.fetchToken = options.fetchToken;
    this.getLanguageHint = options.getLanguageHint;
    this.handlers = options.handlers;
    this.setTimer = options.setTimer ?? setTimeout;
    this.clearTimer = options.clearTimer ?? clearTimeout;
  }

  async connect(): Promise<void> {
    if (this.userStopped) {
      return;
    }

    const token = await this.fetchToken();
    const url = buildRealtimeWebSocketUrl(token, this.getLanguageHint());
    await this.openSocket(url);
  }

  private openSocket(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = this.createWebSocket(url);
      this.socket = socket;
      let started = false;

      socket.addEventListener("message", (event) => {
        if (typeof event.data !== "string") {
          return;
        }
        const decoded = decodeRealtimeMessage(event.data);
        switch (decoded.type) {
          case "sessionStarted":
            started = true;
            this.sessionReady = true;
            this.handlers.onSessionStarted();
            resolve();
            break;
          case "partial":
            this.handlers.onPartial(decoded.text);
            break;
          case "committed":
            this.handlers.onCommitted(decoded.text);
            break;
          case "error":
            if (!started) {
              reject(new Error(decoded.detail));
              return;
            }
            if (!this.userStopped) {
              this.handlers.onError(decoded.detail);
            }
            break;
          default:
            break;
        }
      });

      socket.addEventListener("close", () => {
        this.socket = null;
        this.sessionReady = false;

        if (!started) {
          reject(new Error("ElevenLabs closed the connection before session_started"));
          return;
        }

        if (this.userStopped) {
          return;
        }

        this.scheduleReconnect(0);
      });
    });
  }

  private scheduleReconnect(attempt: number): void {
    if (this.userStopped) {
      return;
    }

    const delay = reconnectDelay(attempt);
    if (delay === null) {
      this.handlers.onFatal?.(
        `Lost the ElevenLabs connection and could not reconnect after ${attempt} attempts`,
      );
      return;
    }

    this.reconnectTimer = this.setTimer(() => {
      this.reconnectTimer = null;
      if (this.userStopped) {
        return;
      }
      void this.connect().catch(() => {
        this.scheduleReconnect(attempt + 1);
      });
    }, delay);
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
    if (this.reconnectTimer) {
      this.clearTimer(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.send(JSON.stringify({ message_type: "input_audio_chunk", commit: true }));
  }

  cancel(): void {
    this.userStopped = true;
    if (this.reconnectTimer) {
      this.clearTimer(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.sessionReady = false;
  }

  shouldReconnect(): boolean {
    return !this.userStopped;
  }
}
