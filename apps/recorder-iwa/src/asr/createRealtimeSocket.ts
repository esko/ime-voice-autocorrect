import type { DictationSessionConfig } from "@input-assist/protocol";
import { AudioPipeline, SAMPLE_RATE } from "../audio/audioPipeline.js";
import type { RealtimeSocketFactory } from "../session/recorderSession.js";
import { fetchElevenLabsRealtimeToken } from "./elevenLabsToken.js";
import { RealtimeSocket } from "./realtimeSocket.js";

export type LanguageHint = DictationSessionConfig["languageHint"];

export const REALTIME_WS_URL = "wss://api.elevenlabs.io/v1/speech-to-text/realtime";

export function languageHintToCode(hint: LanguageHint): string | undefined {
  if (hint === "en") {
    return "en";
  }
  if (hint === "fi") {
    return "fi";
  }
  return undefined;
}

export function buildRealtimeWebSocketUrl(token: string, languageHint: LanguageHint): string {
  const params = new URLSearchParams({
    token,
    encoding: "pcm_s16le",
    sample_rate: String(SAMPLE_RATE),
    commit_strategy: "vad",
  });
  const languageCode = languageHintToCode(languageHint);
  if (languageCode) {
    params.set("language_code", languageCode);
  }
  return `${REALTIME_WS_URL}?${params.toString()}`;
}

export function createRealtimeSocketFactory(options: {
  getApiKey: () => string | null;
  createWebSocket?: (url: string) => WebSocket;
}): RealtimeSocketFactory {
  return (handlers, config) =>
    new RealtimeSocket({
      handlers,
      fetchToken: async () => {
        const apiKey = options.getApiKey();
        if (!apiKey) {
          throw new Error("ElevenLabs API key is not configured");
        }
        return fetchElevenLabsRealtimeToken(apiKey);
      },
      getLanguageHint: () => config.languageHint,
      createWebSocket: (url) => options.createWebSocket?.(url) ?? new WebSocket(url),
    });
}

export function createDefaultAudioPipelineFactory(): () => AudioPipeline {
  return () => new AudioPipeline();
}
