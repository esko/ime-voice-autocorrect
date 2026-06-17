import { buildDebugBundle } from "./debugBundle.js";
import { buildRecorderDiagnosticsState, type RecorderDiagnosticsInput } from "./diagnosticsState.js";

export interface DiagnosticsPanelOptions {
  getState: () => RecorderDiagnosticsInput;
  copyText: (text: string) => Promise<void>;
}

export function copyDiagnosticsBundle(options: DiagnosticsPanelOptions): Promise<void> {
  const bundle = buildDebugBundle(buildRecorderDiagnosticsState(options.getState()));
  return options.copyText(bundle);
}

export function mountDiagnosticsPanel(
  copyButton: HTMLButtonElement,
  status: HTMLElement,
  options: DiagnosticsPanelOptions,
): void {
  copyButton.addEventListener("click", () => {
    void (async () => {
      await copyDiagnosticsBundle(options);
      status.textContent = "Copied debug bundle";
    })();
  });
}
