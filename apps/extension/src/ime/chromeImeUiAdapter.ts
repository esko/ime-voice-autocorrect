import type { AssistiveUndoProperties } from "./assistiveUndo.js";
import { buildAssistiveUndoHide, buildAssistiveUndoShow } from "./assistiveUndo.js";
import type { ImeMenuItem } from "./menu.js";

export interface ChromeImeUiAdapter {
  setMenuItems(engineId: string, items: ImeMenuItem[]): void;
  setAssistiveWindowProperties(
    contextId: number,
    properties: AssistiveUndoProperties,
  ): void;
}

export function createChromeImeUiAdapter(chromeApi: typeof chrome): ChromeImeUiAdapter {
  return {
    setMenuItems(engineId, items) {
      chromeApi.input.ime.setMenuItems({ engineID: engineId, items });
    },
    setAssistiveWindowProperties(contextId, properties) {
      chromeApi.input.ime.setAssistiveWindowProperties({ contextID: contextId, properties });
    },
  };
}

export class AssistiveUndoController {
  private activeContextId: number | null = null;

  constructor(private readonly ui: ChromeImeUiAdapter) {}

  async showCorrection(contextId: number, original: string, corrected: string): Promise<void> {
    this.activeContextId = contextId;
    this.ui.setAssistiveWindowProperties(contextId, buildAssistiveUndoShow(original, corrected));
  }

  hide(): void {
    if (this.activeContextId === null) {
      return;
    }
    this.ui.setAssistiveWindowProperties(this.activeContextId, buildAssistiveUndoHide());
    this.activeContextId = null;
  }

  getActiveContextId(): number | null {
    return this.activeContextId;
  }
}
