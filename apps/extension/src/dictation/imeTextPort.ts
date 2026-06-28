import type { ContextToken, ImeTextPort as CoreImeTextPort } from "@input-assist/dictation-core";

export interface ChromeImeTextAdapter {
  hasValidContext(targetToken?: ContextToken | number): boolean;
  getContextType(): string | undefined;
  getContextToken(): ContextToken | null;
  getContextId(): number | null;
  commitText(text: string, targetToken?: ContextToken | number): Promise<boolean>;
  deleteSurroundingText(length: number): Promise<boolean>;
}

export function createImeTextPort(adapter: ChromeImeTextAdapter): CoreImeTextPort {
  return {
    getContextId: () => adapter.getContextId(),
    getContextToken: () => adapter.getContextToken(),
    hasValidContext: (targetToken?: ContextToken | number) => adapter.hasValidContext(targetToken),
    commitText: async (text, targetToken?: ContextToken | number) => {
      if (!adapter.hasValidContext(targetToken)) {
        return false;
      }
      return adapter.commitText(text, targetToken);
    },
  };
}
