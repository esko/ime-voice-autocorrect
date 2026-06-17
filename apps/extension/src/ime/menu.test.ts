import { describe, expect, it } from "vitest";
import {
  applyMenuItemToggle,
  buildImeMenuItems,
  IME_MENU_ITEM_IDS,
} from "./menu.js";

describe("buildImeMenuItems", () => {
  it("shows recorder and dictation status with toggle items", () => {
    const items = buildImeMenuItems({
      recorderConnected: true,
      dictationActive: false,
      autocorrectEnabled: true,
      dictationEnabled: true,
    });

    expect(items).toEqual([
      {
        id: IME_MENU_ITEM_IDS.dictationStatus,
        label: "Dictation: idle",
        enabled: false,
      },
      {
        id: IME_MENU_ITEM_IDS.recorderStatus,
        label: "Recorder: connected",
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
        checked: true,
        enabled: true,
      },
      {
        id: IME_MENU_ITEM_IDS.toggleDictation,
        label: "Dictation",
        style: "check",
        checked: true,
        enabled: true,
      },
    ]);
  });
});

describe("applyMenuItemToggle", () => {
  it("toggles autocorrect and dictation flags", () => {
    const initial = {
      recorderConnected: false,
      dictationActive: false,
      autocorrectEnabled: true,
      dictationEnabled: true,
    };

    expect(applyMenuItemToggle(IME_MENU_ITEM_IDS.toggleAutocorrect, initial)).toEqual({
      ...initial,
      autocorrectEnabled: false,
    });
    expect(applyMenuItemToggle(IME_MENU_ITEM_IDS.toggleDictation, initial)).toEqual({
      ...initial,
      dictationEnabled: false,
    });
    expect(applyMenuItemToggle(IME_MENU_ITEM_IDS.settingsHint, initial)).toBeNull();
  });
});
