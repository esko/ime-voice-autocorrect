# ChromeOS Input Assist — Agent Handoff

This bundle contains the full implementation handoff for a personal ChromeOS-only input assistant.

It is **not an MVP plan**. All functionality described here is required for the first complete release.

## Product summary

Build a ChromeOS input system with:

- A Manifest V3 ChromeOS IME extension.
- Two IME entries:
  - `Input Assist US`
  - `Input Assist Finnish`
- English-only autocorrect.
- Keyboard-controlled dictation using an external streaming ASR API.
- Automatic text insertion into the active ChromeOS text field through `chrome.input.ime`.
- One visible recorder UI: a tiny unframed/borderless Isolated Web App window.
- No Tabby integration.
- No content-script insertion path.
- No legacy Chrome App.
- No compatibility fallbacks.

## Prior repo to study

Before implementing dictation, study:

- `https://github.com/esko/tabby-voice-dictation`

Use it as the model for the ASR runtime and dictation lifecycle:

- ports-and-adapters architecture
- `DictationSession` lifecycle
- `AudioPipeline`
- `RealtimeSocket`
- `realtimeProtocol`
- `TranscriptDelivery`
- `transcriptFormatter`
- client-side noise gate
- push-to-talk/toggle activation modes
- partial/final transcript handling
- `scratch that` / `undo` command behavior

Do **not** copy the Tabby injection layer. Replace terminal delivery with ChromeOS IME context delivery.

## Hard constraints

- ChromeOS only.
- Personal use only.
- Chrome flags / experimental APIs are allowed and expected.
- The recorder UI must be a **single tiny IWA window**.
- Recording is controlled by keyboard/IME chords, not mouse clicks.
- The recorder window must be treated as passive status UI during dictation.
- Only a small extras/menu button may be clickable, and only when idle.
- Clicking the recorder may focus it; implementation must not rely on any unavailable “unfocusable PWA/IWA” behavior.
- Automatic insertion is required whenever the ChromeOS IME context remains valid.
- Clipboard is not the normal path; it may only be used for explicit diagnostics/manual recovery.

## Start here

1. Read `AGENTS.md`.
2. Read `docs/requirements.md`.
3. Read `docs/architecture.md`.
4. Read `docs/prior-tabby-repo-notes.md`.
5. Read ADRs in `docs/adr/`.
6. Implement from `docs/implementation-plan.md`.
7. Track work using `docs/github-issues.md`.

## Development

```fish
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

Load `apps/extension/dist` as an unpacked ChromeOS IME extension and install the recorder IWA from `apps/recorder-iwa/dist` per `docs/chromeos-install-and-flags.md`.
