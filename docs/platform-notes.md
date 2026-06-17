# Platform notes and source facts

These are implementation facts that must be validated on the target Chromebook during development.

## ChromeOS IME

- `chrome.input.ime` is ChromeOS-only.
- It is used to implement a custom ChromeOS IME.
- It can handle keystrokes, set composition, manage candidate windows, and commit text.
- It requires the `"input"` extension permission.
- `InputContext.contextID` targets text operations and becomes invalid when `onBlur` is called.
- `commitText` commits provided text to the current input context.
- `deleteSurroundingText` deletes text around the caret.
- Assistive window buttons include `undo` and `addToDictionary`.

## IME menu and assistive undo

- Extension registers menu items for dictation status, recorder status, settings hint, and autocorrect/dictation toggles via `chrome.input.ime.setMenuItems`.
- After autocorrect replaces a token, extension shows the ChromeOS undo assistive window via `setAssistiveWindowProperties`.
- Verify both behaviors on the target Chromebook; typings in `@types/chrome` may differ slightly from runtime event shapes.

## input_components

- Define two `input_components`.
- ChromeOS supports one layout per input method.
- Use one layout per component.
- For layouts, use the ChromeOS layout IDs that work on the target Chromebook.
- Initial candidates:
  - US: `us::eng`
  - Finnish: `fi::fin`
- If the manifest requires `xkb:` prefixed IDs in runtime, document the exact accepted strings.

## IWA

- IWAs are bundled, versioned, signed web apps using the `isolated-app://` scheme.
- IWA dev mode is required for local testing.
- Enable `chrome://flags/#enable-isolated-web-app-dev-mode`.
- Install/test via `chrome://web-app-internals`.
- IWA permissions are blocked by default; declare needed `permissions_policy` in the web manifest.
- IWAs can connect to owned extensions via `externally_connectable`.
- The connection is message passing only; the extension cannot inject content into the IWA.

## Unframed/borderless IWA

- Use experimental unframed mode for the recorder window.
- The current WICG proposal describes unframed windows as windows without usual OS/user-agent frame, titlebar, action buttons, or borders; web content controls the full window content.
- Do not infer focus behavior from unframed mode.
- Unframed does not imply non-activating or click-through.

## Focus

- There is no known Chrome/PWA/IWA API for a true unfocusable window.
- There is no known click-through IWA/PWA window API.
- A click in the recorder window may blur the target input.
- Therefore dictation control is keyboard-only and the recorder window is passive during dictation.

## Prior repo facts

`esko/tabby-voice-dictation`:

- Default backend is ElevenLabs realtime streaming.
- It supports live partial streaming, toggle/push-to-talk, a status overlay, client-side noise gate, external CLI backend, and Web Speech backend.
- It uses a ports-and-adapters layout.
- `DictationSession` owns per-run lifecycle.
- `AudioPipeline` owns browser audio capture graph.
- `RealtimeSocket` owns WebSocket session, token minting, PCM encoding, flush, and reconnect.
- `realtimeProtocol` is pure message classification.
- `TranscriptDelivery` owns partial/final reconciliation.
