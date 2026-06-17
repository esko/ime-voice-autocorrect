export type RealtimeServerEvent =
  | { type: "sessionStarted" }
  | { type: "partial"; text: string }
  | { type: "committed"; text: string }
  | { type: "error"; detail: string }
  | { type: "ignored" };

export function decodeRealtimeMessage(raw: string): RealtimeServerEvent {
  let message: unknown;
  try {
    message = JSON.parse(raw);
  } catch {
    return { type: "ignored" };
  }

  if (typeof message !== "object" || message === null) {
    return { type: "ignored" };
  }

  const frame = message as Record<string, unknown>;
  switch (frame.message_type) {
    case "session_started":
      return { type: "sessionStarted" };
    case "partial_transcript":
      return typeof frame.text === "string" && frame.text
        ? { type: "partial", text: frame.text }
        : { type: "ignored" };
    case "committed_transcript":
      return { type: "committed", text: typeof frame.text === "string" ? frame.text : "" };
    default:
      if (/error|invalid/i.test(String(frame.message_type ?? ""))) {
        const detail = frame.error ?? frame.message ?? frame.reason ?? frame.message_type;
        return { type: "error", detail: String(detail) };
      }
      return { type: "ignored" };
  }
}

export const RECONNECT_DELAYS = [400, 1000, 2000] as const;

export function reconnectDelay(attempt: number): number | null {
  return RECONNECT_DELAYS[attempt] ?? null;
}
