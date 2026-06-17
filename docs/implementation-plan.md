# Implementation plan

This is the complete first-release plan. Do not move listed functionality to “later”.

## Phase 0 — Repository scaffold

Create a TypeScript monorepo:

```fish
mkdir -p chromeos-input-assist
cd chromeos-input-assist
pnpm init
pnpm add -D typescript vite vitest eslint prettier zod @types/chrome
```

Create workspaces:

```text
apps/extension
apps/recorder-iwa
packages/protocol
packages/dictation-core
packages/autocorrect-core
packages/test-fixtures
```

Acceptance:

- `pnpm test` runs.
- `pnpm typecheck` runs.
- `pnpm build` builds all packages.
- CI runs test/typecheck/build.

## Phase 1 — Shared protocol package

Implement `packages/protocol`.

Message families:

```ts
type ExtensionToRecorder =
  | { type: "HELLO_ACK"; protocolVersion: 1; extensionState: ExtensionState }
  | { type: "START_SESSION"; sessionId: string; config: DictationSessionConfig }
  | { type: "STOP_SESSION"; sessionId: string }
  | { type: "CANCEL_SESSION"; sessionId: string }
  | { type: "SETTINGS_UPDATED"; settings: SharedSettings }
  | { type: "PING"; id: string }

type RecorderToExtension =
  | { type: "HELLO"; protocolVersion: 1; appId: string }
  | { type: "RECORDER_READY"; capabilities: RecorderCapabilities }
  | { type: "SESSION_STARTED"; sessionId: string }
  | { type: "PARTIAL_TRANSCRIPT"; sessionId: string; text: string; stable?: boolean }
  | { type: "FINAL_TRANSCRIPT"; sessionId: string; text: string }
  | { type: "AUDIO_LEVEL"; sessionId: string; rms: number }
  | { type: "SESSION_ERROR"; sessionId: string; message: string; recoverable: boolean }
  | { type: "SESSION_CLOSED"; sessionId: string; reason: "stopped" | "cancelled" | "error" }
  | { type: "SETTINGS_SNAPSHOT"; settings: SharedSettings }
  | { type: "PONG"; id: string }
```

Requirements:

- Validate all messages using `zod`.
- Reject unknown protocol versions.
- Reject messages with missing session IDs.
- Handle duplicate/late messages safely.

Acceptance:

- Unit tests for every message.
- Unit tests for invalid message rejection.
- Unit tests for session ID mismatch.

## Phase 2 — Dictation core

Implement `packages/dictation-core`, porting the architecture from `esko/tabby-voice-dictation`.

Modules:

```text
dictationSession.ts
backendSession.ts
realtimeProtocol.ts
transcriptFormatter.ts
transcriptDelivery.ts
sessionState.ts
```

Required behavior:

- Toggle activation.
- Push-to-talk activation.
- Key-repeat guard.
- Start/stop/cancel/finalize state transitions.
- Partial transcript handling.
- Final transcript handling.
- `scratch that` / `undo`.
- Spoken punctuation.
- Append-space policy.
- Error teardown.
- Silence timeout support.
- Status updates through a port.

Differences from Tabby plugin:

- Default partials are status-only.
- Final transcript is delivered to `ImeTextPort.commitText`.
- No Tabby terminal target resolution.
- No alt-screen logic.
- No terminal control bytes by default.

Acceptance tests:

- hotkey repeat does not start multiple sessions
- push-to-talk starts on first keydown and stops on keyup
- toggle mode starts/stops on repeated command
- final transcript commits once
- partials do not mutate text by default
- `scratch that` erases prior pending segment
- error cancels backend and clears state
- no silence timeout; sessions end only on chord release, toggle-off, Escape, context loss, or error
- formatter strips unsafe controls from partials
- spoken punctuation transforms expected phrases

## Phase 3 — ASR provider runtime in IWA

Implement recorder-side ASR modules.

Start with ElevenLabs realtime because the prior repo already has a working architecture.

Modules:

```text
apps/recorder-iwa/src/audio/audioPipeline.ts
apps/recorder-iwa/src/audio/pcmWorklet.ts
apps/recorder-iwa/src/audio/pcmUtils.ts
apps/recorder-iwa/src/asr/elevenLabs/realtimeSocket.ts
apps/recorder-iwa/src/asr/elevenLabs/realtimeProtocol.ts
apps/recorder-iwa/src/asr/asrSession.ts
apps/recorder-iwa/src/asr/asrRegistry.ts
```

Requirements:

- `getUserMedia` mic capture.
- 16 kHz mono target.
- `AudioWorklet` frame extraction.
- RMS levels.
- Optional noise gate.
- Float32 to PCM16 conversion.
- Base64 audio frame encoding.
- Single-use token fetch.
- WebSocket open waits for `session_started`.
- Send PCM chunks.
- Flush-on-stop with short silence + commit.
- Bounded flush wait.
- Reconnect transient drops with backoff.
- No reconnect on user stop/cancel.
- Provider errors become `SESSION_ERROR`.
- Final transcript sends `FINAL_TRANSCRIPT`.

Acceptance tests:

- protocol decoder classifies session/partial/committed/error/ignored
- malformed JSON is ignored
- reconnect delay schedule works
- PCM conversion is correct
- socket waits for session started before ready
- socket flush resolves on committed transcript or timeout
- user stop prevents reconnect
- transient close attempts reconnect
- exhausted reconnect reports fatal error

## Phase 4 — Recorder IWA window

Build `apps/recorder-iwa`.

Manifest:

- Located at `/.well-known/manifest.webmanifest`.
- Include `version`.
- Include `update_manifest_url`.
- Include permissions policy for microphone and window-management if needed.
- Use `display_override` with unframed only. No fallback chain.
- Start URL should open the tiny recorder route.

Example shape:

```json
{
  "name": "Input Assist Recorder",
  "short_name": "Input Assist",
  "version": "1.0.0",
  "start_url": "/recorder",
  "scope": "/",
  "display": "standalone",
  "display_override": [
    {
      "display": "unframed",
      "url_patterns": [
        "/recorder",
        { "pathname": "/recorder" }
      ]
    }
  ],
  "permissions_policy": {
    "microphone": ["self"],
    "window-management": ["self"]
  },
  "icons": [
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

UI requirements:

- Tiny borderless/unframed recorder window.
- Idle: status dot + optional small text + extras button.
- Active dictation:
  - status dot/waveform
  - partial transcript optional
  - extras button hidden/disabled
  - no drag controls
  - no clickable main surface
- Error: compact error state.
- Settings route/page inside same IWA.
- Settings reachable only from extras menu while idle.

CSS requirements:

```css
.recorder-surface.active {
  pointer-events: none;
}

.extras-button {
  pointer-events: auto;
}

.recorder-surface.active .extras-button {
  display: none;
}
```

Note: CSS does not make the OS window non-focusing. It only prevents DOM handlers.

Acceptance:

- IWA installs in dev mode.
- Window opens unframed.
- Mic permission can be requested.
- Active state disables clickable UI.
- Status updates from ASR events.
- Settings persist.
- No required mouse operation for normal dictation.

## Phase 5 — IWA ↔ extension bridge

Implement `apps/recorder-iwa/src/bridge` and `apps/extension/src/bridge`.

Requirements:

- Extension declares `externally_connectable` for the IWA origin.
- IWA initiates `chrome.runtime.connect(extensionId)`.
- Extension validates sender URL/origin.
- Protocol version checked.
- Heartbeat ping/pong.
- Reconnect if the Port disconnects.
- Extension exposes recorder availability status.
- IWA sends settings snapshot after connect.
- Extension sends start/stop/cancel commands.
- IWA sends transcript/session/status events.

Extension manifest excerpt:

```json
{
  "externally_connectable": {
    "matches": [
      "isolated-app://REPLACE_WITH_IWA_ORIGIN/*"
    ]
  }
}
```

Acceptance:

- IWA connects to extension.
- Extension rejects unknown origins.
- Disconnection marks recorder unavailable.
- Reconnect restores state.
- Start/stop/cancel commands round trip.
- Transcript events with wrong session ID are ignored.

## Phase 6 — IME extension

Build `apps/extension`.

Manifest requirements:

```json
{
  "manifest_version": 3,
  "name": "ChromeOS Input Assist",
  "version": "1.0.0",
  "permissions": ["input", "storage"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "input_components": [
    {
      "name": "Input Assist US",
      "type": "ime",
      "id": "input-assist-us",
      "description": "US keyboard with Input Assist dictation and English autocorrect",
      "language": "en-US",
      "layouts": ["us::eng"]
    },
    {
      "name": "Input Assist Finnish",
      "type": "ime",
      "id": "input-assist-fi",
      "description": "Finnish keyboard with Input Assist dictation and English autocorrect",
      "language": "fi",
      "layouts": ["fi::fin"]
    }
  ]
}
```

If ChromeOS rejects the layout strings, update to the exact accepted IDs and document in `docs/platform-notes.md`.

IME modules:

```text
ime/contextTracker.ts
ime/keyRouter.ts
ime/layoutPassThrough.ts
ime/dictationKeys.ts
ime/textPort.ts
ime/autocorrectAdapter.ts
ime/assistiveUndo.ts
ime/menu.ts
```

Requirements:

- Track `onFocus`.
- Clear context on `onBlur`.
- Track engine activation/deactivation.
- Track surrounding text.
- Capture dictation chord.
- Handle push-to-talk and toggle.
- Avoid OS key repeat double-start.
- Forward normal keys to ChromeOS.
- Commit final dictation text.
- Replace prior word for autocorrect.
- Show assistive undo window where possible.
- IME menu entries:
  - dictation status
  - recorder status
  - open recorder/settings instruction
  - autocorrect on/off
  - dictation on/off

Acceptance:

- Both input methods appear in ChromeOS.
- US and Finnish layouts type correctly.
- Dictation chord starts/stops recorder without clicking IWA.
- Final transcript commits into active text field.
- Context invalidation on blur prevents unsafe commit.
- Password fields disable dictation/autocorrect.
- URL/email/number fields use conservative behavior.

## Phase 7 — Autocorrect core

Implement `packages/autocorrect-core`.

Modules:

```text
tokenizer.ts
dictionary.ts
symspell.ts
keyboardNeighbors.ts
confidence.ts
personalDictionary.ts
ignoreRules.ts
technicalTokens.ts
autocorrectEngine.ts
```

Requirements:

- English dictionary.
- Frequency ranking.
- SymSpell-style deletion index.
- Keyboard-neighbor typo weighting.
- Conservative confidence threshold.
- Personal dictionary.
- Ignore list.
- Technical dictionary.
- No correction for:
  - tokens containing å/ä/ö
  - URLs
  - emails
  - paths
  - code-like tokens
  - camelCase
  - snake_case
  - kebab-case
  - all-caps identifiers
  - mixed alnum identifiers
  - very short tokens
  - fields where context type is not safe
- Correction on word boundary:
  - space
  - enter
  - punctuation
- Undo:
  - Backspace immediately after correction restores original
  - assistive undo if available
  - Ctrl+Z handling where possible

Acceptance tests:

- `teh -> the`
- `recieve -> receive`
- `neessarily -> necessarily`
- `chromr -> chrome`
- Finnish tokens ignored
- technical tokens ignored
- ambiguous candidates not auto-fixed
- personal dictionary prevents correction
- ignore list prevents correction
- undo restores original

## Phase 8 — Settings

Settings live in the IWA settings page.

Settings groups:

### Dictation

- provider: ElevenLabs realtime
- API key
- input device
- activation: toggle / push-to-talk
- dictation chord
- append space
- spoken punctuation
- language hint:
  - auto
  - en
  - fi
- noise gate
- partial transcript visible in recorder UI

### Autocorrect

- enabled
- aggressive/conservative threshold
- personal dictionary
- ignore list
- technical dictionary
- show undo assistive window
- autocorrect applies to typed input only; dictated text is never corrected

### Window

- size
- position diagnostics
- always start recorder window on launch
- extras button visibility
- show partial transcript
- show waveform

### Diagnostics

- bridge status
- IME status
- recorder status
- last ASR error
- mic level
- protocol version
- copy debug bundle

Requirements:

- Settings persist in IWA storage.
- Settings sync to extension over bridge.
- Extension caches latest settings.
- Sensitive API key is not sent to extension unless needed; ASR key should stay in IWA.

Acceptance:

- Settings survive restart.
- Extension receives non-secret settings snapshot.
- API key stays in IWA.
- Changing dictation mode affects next session.
- Changing autocorrect threshold affects extension immediately.

## Phase 9 — Manual ChromeOS acceptance suite

Create `docs/manual-test-plan.md` and keep it updated.

Required manual tests:

1. Install/load extension.
2. Install/run IWA in dev mode.
3. Select `Input Assist US`.
4. Type US symbols in text field.
5. Select `Input Assist Finnish`.
6. Type Finnish layout symbols and å/ä/ö.
7. Autocorrect `teh`.
8. Undo autocorrect with Backspace.
9. Verify Finnish word with ä is not corrected.
10. Start dictation using keyboard chord.
11. Stop/finalize using keyboard chord.
12. Verify transcript inserts automatically.
13. Click recorder while idle and open extras/settings.
14. Verify recorder active mode hides extras button.
15. Verify clicking recorder during active dictation is not needed.
16. Verify focus loss cancels/blocks unsafe insert.
17. Verify password fields disable assist.
18. Verify reconnect/error UI with ASR network disabled.
19. Verify IWA/extension bridge reconnects after recorder reload.
20. Verify debug bundle contains useful state and no API key.

## Phase 10 — Polish and hardening

Required before complete release:

- Good error messages.
- No unhandled Promise rejections.
- Structured logs.
- Debug bundle export.
- Secret redaction.
- Settings validation.
- Strict TypeScript.
- No `any` except isolated Chrome API boundaries.
- Build reproducibility.
- Install/run instructions.
- Known platform limitations documented.
