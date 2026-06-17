# Architecture

## Components

```text
ChromeOS Input Assist
├── extension/
│   ├── Manifest V3 ChromeOS IME
│   ├── Input Assist US engine
│   ├── Input Assist Finnish engine
│   ├── English autocorrect
│   ├── dictation key handling
│   ├── active context tracking
│   ├── commit/delete text adapter
│   └── bridge endpoint for recorder IWA
│
└── recorder-iwa/
    ├── one tiny unframed IWA window
    ├── mic capture
    ├── external streaming ASR client
    ├── status UI
    ├── settings page
    └── bridge client to extension
```

## Responsibility split

### IME extension owns

- Active ChromeOS input context.
- Keystroke handling while IME is active.
- Autocorrect.
- Dictation hotkeys/chords.
- Text insertion.
- Text deletion/replacement.
- Undo for corrections.
- Receiving final transcript and committing it.

### Recorder IWA owns

- Microphone permission and capture.
- ASR provider credentials/config.
- Streaming connection.
- Partial/final transcript processing from provider.
- Visual status.
- Settings UI.
- Initial handshake with extension.

## Why this split exists

The IWA can provide a cleaner one-window recorder UI than an extension popup, but the IWA cannot reliably insert text into all ChromeOS fields. The IME extension is the component with access to the active input context.

The IWA window cannot be assumed to be non-focusing. Therefore normal dictation controls must be keyboard-only through the IME.

## Prior dictation architecture to reuse

`esko/tabby-voice-dictation` already implements the right dictation-side architecture:

```text
DictationSession
├── BackendSessionRegistry
├── AudioPipeline
├── RealtimeSocket
├── realtimeProtocol
├── TranscriptDelivery
├── transcriptFormatter
└── OverlayPort
```

For this project, adapt it as:

```text
DictationSession
├── AsrSessionRegistry
├── AudioPipeline                    # in recorder IWA
├── RealtimeSocket                   # in recorder IWA
├── realtimeProtocol                 # pure shared package
├── TranscriptDelivery               # pure shared package
├── transcriptFormatter              # pure shared package
├── RecorderStatusPort               # recorder IWA status
└── ImeTextPort                      # extension commit/delete operations
```

Do not implement live partial insertion by default. In this ChromeOS-wide app, partials should update only the tiny recorder window to avoid constantly mutating arbitrary app text fields. Commit final transcript when the ASR provider finalizes or the user stops recording.

Live partial insertion may be implemented only as an explicit setting, and must use `deleteSurroundingText` + `commitText` rather than synthetic keystrokes.

## Runtime flow

### Startup bridge

```text
1. Extension starts.
2. IWA starts.
3. IWA calls chrome.runtime.connect(extensionId).
4. Extension validates sender and protocol version.
5. Extension stores the Port.
6. Extension sends state snapshots over the stored Port.
```

The IWA/PWA must initiate the bridge. The extension cannot initiate the first connection to the web app.

### Typing/autocorrect

```text
1. User selects Input Assist US or Input Assist Finnish.
2. IME receives focus context.
3. Normal keystrokes pass through unless special handling is needed.
4. IME tracks recent text via key events and surrounding text.
5. On word boundary, autocorrect checks the previous token.
6. If high-confidence correction exists:
   a. deleteSurroundingText(previous token)
   b. commitText(corrected token)
   c. record undo entry
   d. show minimal assistive undo/correction status
```

### Dictation

```text
1. User presses IME dictation chord.
2. Extension sends START_SESSION to IWA over established Port.
3. IWA starts mic capture and ASR streaming.
4. IWA sends PARTIAL_TRANSCRIPT events to extension and updates status UI.
5. User releases/presses dictation chord to finalize.
6. Extension sends STOP_SESSION to IWA.
7. IWA flushes the ASR stream and sends FINAL_TRANSCRIPT.
8. Extension performs transcript cleanup.
9. Extension optionally applies English autocorrect to English transcript.
10. Extension commits final text using commitText(contextID).
```

## Data flow

```text
Keyboard events
  -> IME key router
  -> autocorrect/dictation command detector
  -> Chrome input context operations

Mic audio
  -> IWA recorder
  -> ASR provider
  -> IWA transcript state
  -> extension bridge
  -> IME commit

Settings
  -> IWA settings page
  -> IWA storage
  -> bridge settings snapshot
  -> extension storage/cache
```

## Focus policy

- The recorder IWA may receive focus if clicked.
- Therefore, normal recording control must not require clicking it.
- During active dictation, the IWA UI must disable/hide clickable controls.
- The extras button may be clickable only while idle.
- If focus is lost and IME context invalidates, the dictation session should cancel or mark insertion unavailable; do not silently paste elsewhere.

## Suggested repo layout

```text
chromeos-input-assist/
├── AGENTS.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── apps/
│   ├── extension/
│   │   ├── manifest.json
│   │   ├── src/
│   │   │   ├── background.ts
│   │   │   ├── ime/
│   │   │   ├── autocorrect/
│   │   │   ├── dictation/
│   │   │   ├── bridge/
│   │   │   └── storage/
│   │   └── tests/
│   │
│   └── recorder-iwa/
│       ├── .well-known/
│       │   └── manifest.webmanifest
│       ├── src/
│       │   ├── app.ts
│       │   ├── ui/
│       │   ├── audio/
│       │   ├── asr/
│       │   ├── bridge/
│       │   └── settings/
│       └── tests/
│
├── packages/
│   ├── protocol/
│   ├── autocorrect-core/
│   ├── dictation-core/
│   └── test-fixtures/
│
└── docs/
```
