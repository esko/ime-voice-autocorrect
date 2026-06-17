export interface ImeContext {
  contextId: number;
  engineId: string;
}

export class ContextTracker {
  private active: ImeContext | null = null;

  onFocus(engineId: string, context: chrome.input.ime.InputContext): void {
    this.active = { contextId: context.contextID, engineId };
  }

  onBlur(contextId: number): void {
    if (this.active?.contextId === contextId) {
      this.active = null;
    }
  }

  getActive(): ImeContext | null {
    return this.active;
  }

  clear(): void {
    this.active = null;
  }
}
