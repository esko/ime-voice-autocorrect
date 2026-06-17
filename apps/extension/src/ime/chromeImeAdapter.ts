import type { ChromeImeTextAdapter } from "../dictation/imeTextPort.js";

export function createChromeImeAdapter(
  chromeApi: typeof chrome,
  getContext: () => chrome.input.ime.InputContext | null,
  getEngineId: () => string,
): ChromeImeTextAdapter {
  return {
    hasValidContext: () => getContext() !== null,
    getContextType: () => getContext()?.type,
    getContextId: () => getContext()?.contextID ?? null,
    commitText: async (text) => {
      const context = getContext();
      if (!context) {
        return false;
      }
      return new Promise((resolve) => {
        chromeApi.input.ime.commitText({ contextID: context.contextID, text }, (success) =>
          resolve(success),
        );
      });
    },
    deleteSurroundingText: async (length) => {
      const context = getContext();
      if (!context) {
        return false;
      }
      return new Promise((resolve) => {
        chromeApi.input.ime.deleteSurroundingText(
          {
            engineID: getEngineId(),
            contextID: context.contextID,
            offset: -length,
            length,
          },
          () => resolve(true),
        );
      });
    },
  };
}
