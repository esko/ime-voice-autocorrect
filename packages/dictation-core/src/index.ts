export { DictationSession } from "./dictationSession.js";
export type { DictationSessionDeps } from "./dictationSession.js";
export { DEFAULT_DICTATION_CONFIG } from "./config.js";
export type { ActivationMode, DictationConfig } from "./config.js";
export type {
  ImeTextPort,
  LoggerPort,
  RecorderPort,
  RecorderStatusPort,
  StreamHandlers,
} from "./ports.js";
export { detectScratchThat, formatFinalTranscript } from "./transcriptFormatter.js";

