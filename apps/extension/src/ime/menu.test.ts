import { describe, expect, it } from "vitest";
import {
  applyMenuItemToggle,
  buildImeMenuItems,
  IME_MENU_ITEM_IDS,
} from "./menu.js";

describe("buildImeMenuItems", () => {
  it("shows the opted-out-field toggle reflecting the current state", () => {
    const items = buildImeMenuItems({
      autocorrectEnabled: true,
      correctOptedOutFields: false,
    });
    expect(items[0]).toEqual({
      id: IME_MENU_ITEM_IDS.toggleAutocorrect,
      label: "Autocorrect",
      style: "check",
      checked: true,
      enabled: true,
    });
    expect(items[1]).toEqual({
      id: IME_MENU_ITEM_IDS.toggleCorrectOptedOut,
      label: "Correct in terminals & code fields",
      style: "check",
      checked: false,
      enabled: true,
    });
  });
});

describe("applyMenuItemToggle", () => {
  it("toggles each preference independently and ignores unknown items", () => {
    const initial = { autocorrectEnabled: true, correctOptedOutFields: false };

    expect(applyMenuItemToggle(IME_MENU_ITEM_IDS.toggleAutocorrect, initial)).toEqual({
      autocorrectEnabled: false,
      correctOptedOutFields: false,
    });
    expect(applyMenuItemToggle(IME_MENU_ITEM_IDS.toggleCorrectOptedOut, initial)).toEqual({
      autocorrectEnabled: true,
      correctOptedOutFields: true,
    });
    expect(applyMenuItemToggle("nope", initial)).toBeNull();
  });
});
