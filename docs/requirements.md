# Requirements

## User goal

Create a discreet and quick ChromeOS input assistant for typing assistance and dictation.

The user switches between US and Finnish keyboard layouts. The product must replace those with assisted ChromeOS IME entries:

- `Input Assist US`
- `Input Assist Finnish`

The product must work across ChromeOS applications through the ChromeOS input method system, not only inside browser web pages.

## In scope

### IME extension

- Manifest V3 Chrome extension.
- ChromeOS-only IME.
- Two `input_components`.
- Shared input assistant engine.
- English-only autocorrect.
- Dictation keyboard controls.
- Automatic text insertion using `chrome.input.ime.commitText`.
- Surrounding-text tracking using `onSurroundingTextChanged`.
- Text replacement using `deleteSurroundingText` + `commitText`.
- Assistive undo UI where supported.
- IME menu entries for settings/status only.

### Recorder IWA

- One visible IWA window.
- Tiny unframed/borderless UI.
- Status-only during dictation.
- External streaming ASR.
- Microphone capture.
- ASR auth/config stored in IWA settings.
- Settings page inside the IWA.
- Web-app-initiated bridge to extension.
- No required click for dictation operation.

### Autocorrect

- English only.
- Works in both US and Finnish IME entries.
- Conservative behavior for Finnish text and technical text.
- Undo immediately after correction.
- Personal dictionary.
- Ignore list.
- Domain/technical word list.
- Confidence thresholds.
- No autocorrect in unsafe field types.

### Dictation

- Keyboard-controlled start/stop/cancel/finalize.
- External streaming ASR.
- Partial/final transcript state machine.
- Insert final transcript automatically when possible.
- Transcript cleanup before commit.
- English autocorrect can run on English dictation output.
- Finnish dictation may insert raw transcript without Finnish spell correction.
- Reuse the dictation architecture from `esko/tabby-voice-dictation`, adapted from terminal delivery to IME delivery.

## Out of scope

- Tabby integration.
- Content-script insertion architecture.
- Native helper app.
- Legacy Chrome App.
- Android app.
- Linux/Crostini integration.
- Finnish autocorrect.
- LLM-based autocorrect.
- Mouse-controlled dictation.
- Separate puck window.
- General browser compatibility.
- Fallback UI modes.

## Explicit non-goals

- Do not attempt to make an IWA/PWA window truly unfocusable. No such Chrome API is assumed.
- Do not rely on click-through window behavior.
- Do not require the recorder UI to be clicked while dictating.
- Do not use clipboard as the normal insertion path.
