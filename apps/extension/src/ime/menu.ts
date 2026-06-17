export interface ImeMenuState {
  recorderConnected: boolean;
  dictationActive: boolean;
  autocorrectEnabled: boolean;
  dictationEnabled: boolean;
}

export const IME_MENU_ITEM_IDS = {
  dictationStatus: "dictation-status",
  recorderStatus: "recorder-status",
  settingsHint: "settings-hint",
  toggleAutocorrect: "toggle-autocorrect",
  toggleDictation: "toggle-dictation",
} as const;

export type ImeMenuItemId = (typeof IME_MENU_ITEM_IDS)[keyof typeof IME_MENU_ITEM_IDS];

export interface ImeMenuItem {
  id: string;
  label?: string;
  style?: string;
  checked?: boolean;
  enabled?: boolean;
}

export function buildImeMenuItems(state: ImeMenuState): ImeMenuItem[] {
  return [
    {
      id: IME_MENU_ITEM_IDS.dictationStatus,
      label: `Dictation: ${state.dictationActive ? "active" : "idle"}`,
      enabled: false,
    },
    {
      id: IME_MENU_ITEM_IDS.recorderStatus,
      label: `Recorder: ${state.recorderConnected ? "connected" : "disconnected"}`,
      enabled: false,
    },
    {
      id: IME_MENU_ITEM_IDS.settingsHint,
      label: "Open recorder settings from extras while idle",
      enabled: false,
    },
    {
      id: IME_MENU_ITEM_IDS.toggleAutocorrect,
      label: "Autocorrect",
      style: "check",
      checked: state.autocorrectEnabled,
      enabled: true,
    },
    {
      id: IME_MENU_ITEM_IDS.toggleDictation,
      label: "Dictation",
      style: "check",
      checked: state.dictationEnabled,
      enabled: true,
    },
  ];
}

export function applyMenuItemToggle(
  itemId: string,
  state: ImeMenuState,
): ImeMenuState | null {
  if (itemId === IME_MENU_ITEM_IDS.toggleAutocorrect) {
    return { ...state, autocorrectEnabled: !state.autocorrectEnabled };
  }
  if (itemId === IME_MENU_ITEM_IDS.toggleDictation) {
    return { ...state, dictationEnabled: !state.dictationEnabled };
  }
  return null;
}
