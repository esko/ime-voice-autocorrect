export interface ImeMenuState {
  autocorrectEnabled: boolean;
}

export const IME_MENU_ITEM_IDS = {
  toggleAutocorrect: "toggle-autocorrect",
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
  ];
}

export function applyMenuItemToggle(
  itemId: string,
  state: ImeMenuState,
): ImeMenuState | null {
  if (itemId === IME_MENU_ITEM_IDS.toggleAutocorrect) {
    return { ...state, autocorrectEnabled: !state.autocorrectEnabled };
  }
  return null;
}
