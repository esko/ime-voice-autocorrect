export interface AssistiveUndoProperties {
  type: "undo";
  visible: boolean;
  announceString?: string;
}

export function buildAssistiveUndoShow(original: string, corrected: string): AssistiveUndoProperties {
  return {
    type: "undo",
    visible: true,
    announceString: `Changed ${original} to ${corrected}`,
  };
}

export function buildAssistiveUndoHide(): AssistiveUndoProperties {
  return {
    type: "undo",
    visible: false,
  };
}
