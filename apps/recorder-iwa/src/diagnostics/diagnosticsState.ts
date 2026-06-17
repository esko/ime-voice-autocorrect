import type { SharedSettings } from "@input-assist/protocol";
import { redactSecrets } from "./debugBundle.js";

export interface RecorderDiagnosticsInput {
  bridgeConnected: boolean;
  protocolVersion: number;
  lastAsrError: string | null;
  micLevel: number | null;
  settings: SharedSettings;
  apiKey?: string;
}

export function buildRecorderDiagnosticsState(
  input: RecorderDiagnosticsInput,
): Record<string, unknown> {
  const apiKey = input.apiKey ? redactSecrets(input.apiKey) : undefined;
  return {
    bridgeConnected: input.bridgeConnected,
    protocolVersion: input.protocolVersion,
    lastAsrError: input.lastAsrError,
    micLevel: input.micLevel,
    settings: input.settings,
    ...(apiKey !== undefined ? { apiKey } : {}),
  };
}
