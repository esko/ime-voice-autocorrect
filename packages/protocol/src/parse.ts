import { ZodError } from "zod";
import {
  extensionToRecorderMessageSchema,
  recorderToExtensionMessageSchema,
  type ExtensionToRecorderMessage,
  type RecorderToExtensionMessage,
} from "./schemas.js";

export class ProtocolParseError extends Error {
  readonly cause: ZodError | undefined;

  constructor(message: string, cause?: ZodError) {
    super(message);
    this.name = "ProtocolParseError";
    this.cause = cause;
  }
}

function toProtocolParseError(error: unknown): ProtocolParseError {
  if (error instanceof ZodError) {
    return new ProtocolParseError("Invalid bridge protocol message", error);
  }

  return new ProtocolParseError("Invalid bridge protocol message");
}

export function parseRecorderToExtension(message: unknown): RecorderToExtensionMessage {
  try {
    return recorderToExtensionMessageSchema.parse(message);
  } catch (error) {
    throw toProtocolParseError(error);
  }
}

export function parseExtensionToRecorder(message: unknown): ExtensionToRecorderMessage {
  try {
    return extensionToRecorderMessageSchema.parse(message);
  } catch (error) {
    throw toProtocolParseError(error);
  }
}
