export interface ChromeImeTextAdapter {
  getContextId(): number | null;
  commitText(text: string): Promise<boolean>;
  deleteSurroundingText(length: number): Promise<boolean>;
  sendBackspaces(length: number): Promise<boolean>;
}

export function createChromeImeAdapter(
  chromeApi: typeof chrome,
  getContext: () => chrome.input.ime.InputContext | null,
  getEngineId: () => string,
): ChromeImeTextAdapter {
  return {
    getContextId: () => getContext()?.contextID ?? null,
    commitText: (text) =>
      new Promise((resolve) => {
        const context = getContext();
        if (!context) {
          resolve(false);
          return;
        }
        chromeApi.input.ime.commitText({ contextID: context.contextID, text }, (success) =>
          resolve(success),
        );
      }),
    deleteSurroundingText: (length) =>
      new Promise((resolve) => {
        const context = getContext();
        if (!context) {
          resolve(false);
          return;
        }
        chromeApi.input.ime.deleteSurroundingText(
          {
            engineID: getEngineId(),
            contextID: context.contextID,
            offset: -length,
            length,
          },
          () => resolve(true),
        );
      }),
    sendBackspaces: (length) =>
      new Promise((resolve) => {
        const context = getContext();
        if (!context) {
          resolve(false);
          return;
        }
        const keyData = Array.from({ length }, () => [
          { key: "Backspace", code: "Backspace", type: "keydown" },
          { key: "Backspace", code: "Backspace", type: "keyup" },
        ]).flat();
        chromeApi.input.ime.sendKeyEvents(
          { contextID: context.contextID, keyData },
          () => resolve(true),
        );
      }),
  };
}
