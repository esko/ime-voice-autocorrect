import type { z } from "zod";
import type {
  dictationSessionConfigSchema,
  extensionStateSchema,
  recorderCapabilitiesSchema,
  sharedSettingsSchema,
} from "./schemas.js";

export type ExtensionState = z.infer<typeof extensionStateSchema>;
export type DictationSessionConfig = z.infer<typeof dictationSessionConfigSchema>;
export type SharedSettings = z.infer<typeof sharedSettingsSchema>;
export type RecorderCapabilities = z.infer<typeof recorderCapabilitiesSchema>;

export type {
  ExtensionToRecorderMessage,
  RecorderToExtensionMessage,
} from "./schemas.js";
