import type { AssistiveUndoProperties } from "./assistiveUndo.js";
import { buildAssistiveUndoHide, buildAssistiveUndoShow } from "./assistiveUndo.js";
import type { ImeMenuItem } from "./menu.js";

export interface CandidateView {
  id: number;
  candidate: string;
  label?: string;
  annotation?: string;
}

export interface ChromeImeUiAdapter {
  setMenuItems(engineId: string, items: ImeMenuItem[]): void;
  setAssistiveWindowProperties(
    contextId: number,
    properties: AssistiveUndoProperties,
  ): void;
  setCandidates(contextId: number, candidates: CandidateView[]): void;
  setCandidateWindowVisible(engineId: string, visible: boolean): void;
}

export function createChromeImeUiAdapter(chromeApi: typeof chrome): ChromeImeUiAdapter {
  // These window operations target a context/engine that can go inactive between
  // the time we decide to paint and the time the call runs (focus moves, the
  // field blurs). ChromeOS then reports "Context is not active"; reading
  // runtime.lastError in the callback marks it handled so it never surfaces as an
  // uncaught promise rejection. The try/catch covers synchronous throws too.
  const swallow = (): void => {
    void chromeApi.runtime?.lastError;
  };
  const guard = (operation: () => void): void => {
    try {
      operation();
    } catch {
      /* context/engine went away between scheduling and running */
    }
  };

  return {
    setMenuItems(engineId, items) {
      guard(() => chromeApi.input.ime.setMenuItems({ engineID: engineId, items }, swallow));
    },
    setAssistiveWindowProperties(contextId, properties) {
      guard(() =>
        chromeApi.input.ime.setAssistiveWindowProperties(
          { contextID: contextId, properties },
          swallow,
        ),
      );
    },
    setCandidates(contextId, candidates) {
      guard(() =>
        chromeApi.input.ime.setCandidates(
          {
            contextID: contextId,
            candidates: candidates.map((candidate) => ({
              candidate: candidate.candidate,
              id: candidate.id,
              label: candidate.label,
              annotation: candidate.annotation,
            })),
          },
          swallow,
        ),
      );
    },
    setCandidateWindowVisible(engineId, visible) {
      guard(() =>
        chromeApi.input.ime.setCandidateWindowProperties(
          {
            engineID: engineId,
            properties: { visible, cursorVisible: false, vertical: true, pageSize: 5 },
          },
          swallow,
        ),
      );
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
