import { applyMenuItemToggle, buildImeMenuItems, type ImeMenuState } from "./menu.js";
import type { ChromeImeUiAdapter } from "./chromeImeUiAdapter.js";

export class ImeMenuController {
  constructor(
    private readonly ui: ChromeImeUiAdapter,
    private state: ImeMenuState,
    private readonly onStateChange: (state: ImeMenuState) => void,
  ) {}

  getState(): ImeMenuState {
    return this.state;
  }

  update(partial: Partial<ImeMenuState>): void {
    this.state = { ...this.state, ...partial };
  }

  refresh(engineId: string): void {
    this.ui.setMenuItems(engineId, buildImeMenuItems(this.state));
  }

  handleItemActivated(itemId: string, engineId: string): void {
    const next = applyMenuItemToggle(itemId, this.state);
    if (!next) {
      return;
    }
    this.state = next;
    this.onStateChange(next);
    this.refresh(engineId);
  }
}
