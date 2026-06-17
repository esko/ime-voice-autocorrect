# Prior repo notes: `esko/tabby-voice-dictation`

## Why this repo matters

The previous Tabby plugin already solved most of the dictation runtime shape:

- hotkey-triggered dictation
- toggle and push-to-talk modes
- realtime ElevenLabs streaming
- partial and committed transcript events
- AudioWorklet mic capture
- 16 kHz mono PCM pipeline
- client-side noise gate
- flush-on-stop handshake
- reconnect backoff
- transcript cleanup
- spoken punctuation
- scratch-that / undo command
- status overlay with microphone level

The new project should reuse the **architecture and core ideas**, but not the Tabby-specific terminal injection code.

## Directly reusable concepts

### 1. Ports and adapters

The Tabby repo keeps `DictationSession` framework-agnostic and injects ports for terminal, overlay, preview, config, logger, and backend registry.

For this project, use this equivalent:

```ts
interface ImeTextPort {
  hasValidContext(): boolean
  commitText(text: string): Promise<boolean>
  replacePreviousText(previousLength: number, replacement: string): Promise<boolean>
  showUndo(text: string): Promise<void>
}

interface RecorderPort {
  startSession(config: DictationConfig): Promise<void>
  stopSession(): Promise<void>
  cancelSession(): Promise<void>
  setStatus(status: RecorderStatus): void
}

interface ConfigPort {
  get(): DictationConfig
}

interface LoggerPort {
  warn(message: string): void
  error(message: string): void
}
```

### 2. Audio pipeline

Reuse the shape:

```text
getUserMedia
-> AudioContext({ sampleRate: 16000 })
-> MediaStreamSource
-> AudioWorklet
-> Float32 frames
-> RMS levels
```

For the new project, the audio pipeline lives in the IWA, not in the extension.

Keep the same teardown rules:

- stop tracks
- close AudioContext
- disconnect worklet node
- revoke Blob URL
- support muted mode during flush
- continue level events while muted if useful

### 3. Realtime socket

Reuse the shape:

```text
fetch single-use token
open WebSocket
wait for session_started
send PCM16 base64 chunks
decode messages in pure realtimeProtocol module
flush on stop using short silence buffer + commit flag
reconnect transient drops with fixed backoff
close without reconnect on user stop/cancel
```

### 4. Pure protocol decoder

Keep ASR provider frame decoding pure:

```ts
type RealtimeServerEvent =
  | { type: "sessionStarted" }
  | { type: "partial"; text: string }
  | { type: "committed"; text: string }
  | { type: "error"; detail: string }
  | { type: "ignored" }
```

Provider-specific code belongs in provider modules. If ElevenLabs remains the first provider, preserve the existing message classification style.

### 5. Transcript formatter

Reuse these concepts:

- spoken punctuation
- safe replacements
- command replacements disabled by default
- `scratch that` / `undo`
- format partials without dangerous control characters
- append-space policy

Change terminal-specific parts:

- Do not emit carriage returns as terminal commands by default.
- Do not send Ctrl-C/Escape control bytes.
- If command mode exists, it must be explicitly enabled and should commit normal text commands only unless the target field is known safe.

### 6. Transcript delivery

The Tabby repo uses backspace reconciliation for terminal partials. In this project:

- default: partials update recorder UI only, not the focused text field
- final transcript commits once through IME
- optional experimental live partial insertion must reconcile using:
  - `deleteSurroundingText`
  - `commitText`
  - an internal `liveInsertedLength`
  - not synthetic backspace keystrokes

### 7. Overlay/status

The Tabby overlay uses `pointer-events: none` and does not interfere with terminal input. Keep this principle:

- recorder main surface must be passive
- active dictation hides/disables extras button
- no hover/drag/click controls during recording
- status events show idle/listening/streaming/error/finalizing

## What not to reuse

Do not reuse:

- Tabby `TerminalPort`
- terminal target resolution
- alt-screen logic
- terminal decorator
- terminal keystroke injection
- Tabby settings/vault integration
- Angular module structure

Replace these with:

- ChromeOS IME context tracking
- IME commit/delete operations
- IWA settings
- Chrome runtime messaging bridge
- IWA unframed window
