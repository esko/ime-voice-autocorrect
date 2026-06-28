# Platform notes and source facts

Implementation facts to validate on the target Chromebook during development.

## ChromeOS IME (`chrome.input.ime`)

- ChromeOS-only; requires the `"input"` permission.
- Handles keystrokes, composition, candidate windows, and committed text.
- `InputContext.contextID` targets text operations and becomes invalid on
  `onBlur`.
- `commitText` commits text to the current input context;
  `deleteSurroundingText` deletes around the caret.
- `onKeyEvent` returns a boolean: **`true` consumes the key (it is swallowed);
  `false` passes it through** (the character types normally). Return `true` only
  for keys the IME actually handles.
- A key's physical identity is `keyData.code` (e.g. `"AltRight"`); `keyData.key`
  is the layout-dependent value (e.g. `"Alt"` / `"AltGraph"`). Match physical
  keys on `code`, characters on `key`.
- `setMenuItems` only works for the **currently active** engine. Track
  `onActivate` / `onDeactivated` and repaint menus only while active. Calling it
  otherwise throws "The engine is not active."
- Assistive window buttons include `undo` and `addToDictionary`
  (`setAssistiveWindowProperties`).
- `@types/chrome` shapes may differ slightly from runtime; verify on device.

## input_components

- Two `input_components` (US, Finnish); ChromeOS supports one layout per input
  method.
- Initial layout IDs: US `us::eng`, Finnish `fi::fin`. If the runtime requires
  `xkb:`-prefixed IDs, document the exact accepted strings here.

## Extension loading on ChromeOS

- MV3 service workers often fail to register when the unpacked extension is
  loaded from Crostini/Linux files ("An unknown error occurred when fetching the
  script."). Load from a ChromeOS-native path (e.g. My files → Downloads).
- "Service worker (inactive)" is normal — the worker idles between events.
