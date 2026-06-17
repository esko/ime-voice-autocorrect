import { z } from "zod";
import { PROTOCOL_VERSION } from "./version.js";

export const sessionIdSchema = z.string().min(1);

export const extensionStateSchema = z.object({
  recorderConnected: z.boolean(),
});

export const dictationSessionConfigSchema = z.object({
  activationMode: z.enum(["push-to-talk", "toggle"]),
  languageHint: z.enum(["auto", "en", "fi"]),
  spokenPunctuation: z.boolean(),
  appendSpace: z.boolean(),
});

export const sharedSettingsSchema = z
  .object({
    activationMode: z.enum(["push-to-talk", "toggle"]).optional(),
    languageHint: z.enum(["auto", "en", "fi"]).optional(),
    spokenPunctuation: z.boolean().optional(),
    appendSpace: z.boolean().optional(),
    showPartialTranscript: z.boolean().optional(),
    personalDictionary: z.array(z.string().min(1)).optional(),
    ignoreList: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const recorderCapabilitiesSchema = z.object({
  asrProvider: z.literal("elevenlabs-realtime"),
});

const protocolVersionSchema = z.literal(PROTOCOL_VERSION);

export const helloMessageSchema = z.object({
  type: z.literal("HELLO"),
  protocolVersion: protocolVersionSchema,
  appId: z.string().min(1),
});

export const helloAckMessageSchema = z.object({
  type: z.literal("HELLO_ACK"),
  protocolVersion: protocolVersionSchema,
  extensionState: extensionStateSchema,
});

export const recorderReadyMessageSchema = z.object({
  type: z.literal("RECORDER_READY"),
  capabilities: recorderCapabilitiesSchema,
});

export const sessionStartedMessageSchema = z.object({
  type: z.literal("SESSION_STARTED"),
  sessionId: sessionIdSchema,
});

export const partialTranscriptMessageSchema = z.object({
  type: z.literal("PARTIAL_TRANSCRIPT"),
  sessionId: sessionIdSchema,
  text: z.string(),
  stable: z.boolean().optional(),
});

export const finalTranscriptMessageSchema = z.object({
  type: z.literal("FINAL_TRANSCRIPT"),
  sessionId: sessionIdSchema,
  text: z.string(),
});

export const audioLevelMessageSchema = z.object({
  type: z.literal("AUDIO_LEVEL"),
  sessionId: sessionIdSchema,
  rms: z.number().min(0),
});

export const sessionErrorMessageSchema = z.object({
  type: z.literal("SESSION_ERROR"),
  sessionId: sessionIdSchema,
  message: z.string().min(1),
  recoverable: z.boolean(),
});

export const sessionClosedMessageSchema = z.object({
  type: z.literal("SESSION_CLOSED"),
  sessionId: sessionIdSchema,
  reason: z.enum(["stopped", "cancelled", "error"]),
});

export const settingsSnapshotMessageSchema = z.object({
  type: z.literal("SETTINGS_SNAPSHOT"),
  settings: sharedSettingsSchema,
});

export const pongMessageSchema = z.object({
  type: z.literal("PONG"),
  id: z.string().min(1),
});

export const startSessionMessageSchema = z.object({
  type: z.literal("START_SESSION"),
  sessionId: sessionIdSchema,
  config: dictationSessionConfigSchema,
});

export const stopSessionMessageSchema = z.object({
  type: z.literal("STOP_SESSION"),
  sessionId: sessionIdSchema,
});

export const cancelSessionMessageSchema = z.object({
  type: z.literal("CANCEL_SESSION"),
  sessionId: sessionIdSchema,
});

export const settingsUpdatedMessageSchema = z.object({
  type: z.literal("SETTINGS_UPDATED"),
  settings: sharedSettingsSchema,
});

export const pingMessageSchema = z.object({
  type: z.literal("PING"),
  id: z.string().min(1),
});

export const recorderToExtensionMessageSchema = z.discriminatedUnion("type", [
  helloMessageSchema,
  recorderReadyMessageSchema,
  sessionStartedMessageSchema,
  partialTranscriptMessageSchema,
  finalTranscriptMessageSchema,
  audioLevelMessageSchema,
  sessionErrorMessageSchema,
  sessionClosedMessageSchema,
  settingsSnapshotMessageSchema,
  pongMessageSchema,
]);

export const extensionToRecorderMessageSchema = z.discriminatedUnion("type", [
  helloAckMessageSchema,
  startSessionMessageSchema,
  stopSessionMessageSchema,
  cancelSessionMessageSchema,
  settingsUpdatedMessageSchema,
  pingMessageSchema,
]);

export type RecorderToExtensionMessage = z.infer<typeof recorderToExtensionMessageSchema>;
export type ExtensionToRecorderMessage = z.infer<typeof extensionToRecorderMessageSchema>;
export type SessionScopedRecorderMessage = Extract<
  RecorderToExtensionMessage,
  { sessionId: string }
>;
export type SessionScopedExtensionMessage = Extract<
  ExtensionToRecorderMessage,
  { sessionId: string }
>;
