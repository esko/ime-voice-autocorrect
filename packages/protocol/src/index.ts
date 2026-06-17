export { PROTOCOL_VERSION } from "./version.js";
export {
  parseExtensionToRecorder,
  parseRecorderToExtension,
  ProtocolParseError,
} from "./parse.js";
export {
  isSessionIdMatch,
  isSessionScopedExtensionMessage,
  isSessionScopedRecorderMessage,
} from "./session.js";
export type {
  DictationSessionConfig,
  ExtensionState,
  ExtensionToRecorderMessage,
  RecorderCapabilities,
  RecorderToExtensionMessage,
  SharedSettings,
} from "./types.js";
