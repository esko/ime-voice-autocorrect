import type {
  ExtensionToRecorderMessage,
  RecorderToExtensionMessage,
  SessionScopedExtensionMessage,
  SessionScopedRecorderMessage,
} from "./schemas.js";

const RECORDER_SESSION_TYPES = new Set<RecorderToExtensionMessage["type"]>([
  "SESSION_STARTED",
  "PARTIAL_TRANSCRIPT",
  "COMMITTED_TRANSCRIPT",
  "AUDIO_LEVEL",
  "SESSION_ERROR",
  "SESSION_CLOSED",
]);

const EXTENSION_SESSION_TYPES = new Set<ExtensionToRecorderMessage["type"]>([
  "START_SESSION",
  "STOP_SESSION",
  "CANCEL_SESSION",
]);

export function isSessionScopedRecorderMessage(
  message: RecorderToExtensionMessage,
): message is SessionScopedRecorderMessage {
  return RECORDER_SESSION_TYPES.has(message.type);
}

export function isSessionScopedExtensionMessage(
  message: ExtensionToRecorderMessage,
): message is SessionScopedExtensionMessage {
  return EXTENSION_SESSION_TYPES.has(message.type);
}

export function isSessionIdMatch(
  message: SessionScopedRecorderMessage | SessionScopedExtensionMessage,
  activeSessionId: string,
): boolean {
  return message.sessionId === activeSessionId;
}
