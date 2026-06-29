export interface ImeMenuState {
  autocorrectEnabled: boolean;
  correctOptedOutFields: boolean;
}

export const IME_MENU_ITEM_IDS = {
  toggleAutocorrect: "toggle-autocorrect",
  toggleCorrectOptedOut: "toggle-correct-opted-out",
  manageCorrections: "manage-corrections",
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
      id: IME_MENU_ITEM_IDS.toggleAutocorrect,
      label: "Autocorrect",
      style: "check",
      checked: state.autocorrectEnabled,
      enabled: true,
    },
    {
      id: IME_MENU_ITEM_IDS.toggleCorrectOptedOut,
      label: "Correct in terminals & code fields",
      style: "check",
      checked: state.correctOptedOutFields,
      enabled: true,
    },
    {
      id: IME_MENU_ITEM_IDS.manageCorrections,
      label: "Manage learned corrections…",
      style: "none",
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
  if (itemId === IME_MENU_ITEM_IDS.toggleCorrectOptedOut) {
    return { ...state, correctOptedOutFields: !state.correctOptedOutFields };
  }
  return null;
}
