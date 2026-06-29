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
  // These window/menu operations target a context or engine that can be inactive
  // by the time the call runs (focus moves, the field blurs, or the MV3 service
  // worker restarted). ChromeOS then reports "Context is not active" / "The
  // engine is not active". In MV3 these APIs return a Promise that *rejects*, so
  // we capture it and swallow the rejection (and try/catch any synchronous
  // throw); otherwise it surfaces as an uncaught-in-promise error.
  const guard = (operation: () => unknown): void => {
    try {
      const result = operation();
      if (result && typeof (result as PromiseLike<unknown>).then === "function") {
        (result as PromiseLike<unknown>).then(undefined, () => {});
      }
    } catch {
      /* context/engine went away between scheduling and running */
    }
  };

  return {
    setMenuItems(engineId, items) {
      guard(() => chromeApi.input.ime.setMenuItems({ engineID: engineId, items }));
    },
    setAssistiveWindowProperties(contextId, properties) {
      guard(() =>
        chromeApi.input.ime.setAssistiveWindowProperties({ contextID: contextId, properties }),
      );
    },
    setCandidates(contextId, candidates) {
      guard(() =>
        chromeApi.input.ime.setCandidates({
          contextID: contextId,
          candidates: candidates.map((candidate) => ({
            candidate: candidate.candidate,
            id: candidate.id,
            label: candidate.label,
            annotation: candidate.annotation,
          })),
        }),
      );
    },
    setCandidateWindowVisible(engineId, visible) {
      guard(() =>
        chromeApi.input.ime.setCandidateWindowProperties({
          engineID: engineId,
          properties: { visible, cursorVisible: false, vertical: true, pageSize: 5 },
        }),
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
