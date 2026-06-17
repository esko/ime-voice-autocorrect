import type { ImeTextPort as CoreImeTextPort } from "@input-assist/dictation-core";

export interface ChromeImeTextAdapter {
  hasValidContext(): boolean;
  getContextType(): string | undefined;
  getContextId(): number | null;
  commitText(text: string): Promise<boolean>;
  deleteSurroundingText(length: number): Promise<boolean>;
}

export function createImeTextPort(adapter: ChromeImeTextAdapter): CoreImeTextPort {
  return {
    hasValidContext: () => adapter.hasValidContext(),
    commitText: async (text) => {
      if (!adapter.hasValidContext()) {
        return false;
      }
      return adapter.commitText(text);
    },
  };
}
