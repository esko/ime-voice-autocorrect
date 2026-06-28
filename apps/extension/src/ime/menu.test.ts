import { describe, expect, it } from "vitest";
import {
  applyMenuItemToggle,
  buildImeMenuItems,
  IME_MENU_ITEM_IDS,
} from "./menu.js";

describe("buildImeMenuItems", () => {
  it("shows an autocorrect toggle reflecting the current state", () => {
    expect(buildImeMenuItems({ autocorrectEnabled: true })).toEqual([
      {
        id: IME_MENU_ITEM_IDS.toggleAutocorrect,
        label: "Autocorrect",
        style: "check",
        checked: true,
        enabled: true,
      },
    ]);
  });
});

describe("applyMenuItemToggle", () => {
  it("toggles the autocorrect flag and ignores unknown items", () => {
    const initial = { autocorrectEnabled: true };

    expect(applyMenuItemToggle(IME_MENU_ITEM_IDS.toggleAutocorrect, initial)).toEqual({
      autocorrectEnabled: false,
    });
    expect(applyMenuItemToggle("nope", initial)).toBeNull();
  });
});
