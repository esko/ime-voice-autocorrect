import type { ChromeImeTextAdapter } from "../dictation/imeTextPort.js";

export function createChromeImeAdapter(
  chromeApi: typeof chrome,
  getContext: () => chrome.input.ime.InputContext | null,
  getEngineId: () => string,
  getToken?: () => { contextId: number; generation: number } | null,
): ChromeImeTextAdapter {
  return {
    hasValidContext: (token?: { contextId: number; generation: number } | number) => {
      const currentContext = getContext();
      if (!currentContext) return false;
      if (token === undefined) return true;
      if (typeof token === "number") {
        return currentContext.contextID === token;
      }
      const currentToken = getToken?.();
      if (!currentToken) return false;
      return currentToken.contextId === token.contextId && currentToken.generation === token.generation;
    },
    getContextType: () => getContext()?.type,
    getContextToken: () => getToken?.() ?? null,
    getContextId: () => getContext()?.contextID ?? null,
    commitText: async (text, targetToken?: { contextId: number; generation: number } | number) => {
      const context = getContext();
      if (!context && targetToken === undefined) {
        return false;
      }
      let idToCommit: number;
      if (targetToken !== undefined) {
        idToCommit = typeof targetToken === "number" ? targetToken : targetToken.contextId;
      } else {
        idToCommit = context!.contextID;
      }
      return new Promise((resolve) => {
        chromeApi.input.ime.commitText({ contextID: idToCommit, text }, (success) =>
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
