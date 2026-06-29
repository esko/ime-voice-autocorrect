# Platform notes and source facts

Implementation facts to validate on the target Chromebook during development.

## ChromeOS IME (`chrome.input.ime`)

- ChromeOS-only; requires the `"input"` permission.
- Handles keystrokes, composition, candidate windows, and committed text.
- `InputContext.contextID` targets text operations and becomes invalid on
  `onBlur`.
- `commitText` commits text to the current input context;
  `deleteSurroundingText` deletes around the caret.
- `sendKeyEvents` accepts a target `contextID` plus a sequence of keyboard
  events. The extension uses paired Backspace keydown/keyup events as an
  opt-in fallback for terminals and code fields that set `autoCorrect=false`
  and ignore `deleteSurroundingText`. This path defaults off. Verify on the
  target Chromebook that the Terminal consumes the synthetic Backspaces and
  that the events do not re-enter the IME's `onKeyEvent` listener.
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

- One `input_components` entry named `Input Assist`, with id `input-assist`.
- The configured layout ID is `us::eng`. If the runtime requires an
  `xkb:`-prefixed ID, document the exact accepted string here.

## Extension loading on ChromeOS

- MV3 service workers often fail to register when the unpacked extension is
  loaded from Crostini/Linux files ("An unknown error occurred when fetching the
  script."). Load from a ChromeOS-native path (e.g. My files → Downloads).
- "Service worker (inactive)" is normal — the worker idles between events.
