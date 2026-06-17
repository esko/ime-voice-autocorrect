# Input Assist

A ChromeOS input assistant that replaces the user's US and Finnish keyboard layouts with assisted IME entries offering English autocorrect and voice dictation.

## Language

**Input Assist**:
The product name used in all everyday user-facing text — IME menu labels, recorder window, status messages.
_Avoid_: ChromeOS Input Assist (except extension listing and install docs where ChromeOS disambiguation is needed)

**Input Method**:
A ChromeOS IME entry the user selects from the system input picker. Input Assist exposes exactly two: Input Assist US and Input Assist Finnish. Each Input Method maps to exactly one keyboard layout.
_Avoid_: Layout, keyboard mode, input component (use in Chrome API context only)

**Push-to-talk**:
The default dictation activation mode. The user holds the dictation chord to record and releases it to stop and commit the final transcript.
_Avoid_: Hold-to-talk (informal synonym only)

**Toggle mode**:
An optional dictation activation setting. One press of the dictation chord starts recording; a second press stops and commits.

**Dictation chord**:
The keyboard key or key combination that controls dictation through the active Input Method. Default: Right Alt hold (push-to-talk). Configurable in recorder settings.
_Avoid_: Hotkey (too generic), shortcut (implies OS-level, not IME-captured)

**Context loss**:
When the active text field loses focus and the IME no longer has a valid insertion context during an active dictation session. Input Assist cancels the session immediately, discards the in-progress transcript, and does not insert text.
_Avoid_: Blur (implementation term), focus invalidation

**Cancel**:
Abort an active dictation session without inserting text. Triggered by pressing Escape while dictation is active. Distinct from releasing the dictation chord, which finalizes and commits.
_Avoid_: Stop (implies commit), dismiss

**Autocorrect**:
English spell correction applied only to typed input at word boundaries. Dictated text is inserted after transcript cleanup but is never run through the autocorrect engine.
_Avoid_: Spell check (broader), correction (ambiguous with transcript cleanup)

**Partial transcript**:
The in-progress ASR text for the current utterance. Shown in the recorder window by default during an active dictation session. Never inserted into the active text field until the session finalizes.
_Avoid_: Live text, streaming insert

**Dictation Session**:
A period of active dictation from start to end. Lifecycle depends on activation mode:
- **Push-to-talk** (default): one session per chord hold — starts on keydown, finalizes on keyup with a single commit.
- **Toggle mode**: starts on first chord press, streams continuously until manually ended (second chord press or Escape), then commits the entire transcript as one insert. No mid-session commits.
_Avoid_: ASR session (provider-internal), bridge session (transport-internal — use only in protocol context)

**Silence timeout**:
Not used. Dictation sessions end only by chord release (push-to-talk), manual toggle-off, Escape cancel, context loss, or error — never by detected silence.
_Avoid_: Auto-stop, voice activity timeout

**Append space**:
Whether a trailing space is added after the final dictated text on commit. Off by default.
_Avoid_: Trailing space (use only in settings UI if needed)

**Spoken punctuation**:
Converting spoken phrases ("comma", "period", "new line") into punctuation during transcript cleanup. On by default.
_Avoid_: Voice commands (reserved for control commands like scratch that)

**Recorder**:
The isolated web app (IWA) that captures microphone audio, streams to ASR, and shows dictation status. If not running when dictation starts, the extension auto-launches it and waits for the bridge connection before beginning the session.
_Avoid_: IWA (implementation term), puck (not used)

**Scratch that**:
A voice command during an active dictation session that removes the last spoken segment from the in-progress transcript before commit. Ported from the Tabby dictation architecture.
_Avoid_: Undo (use for autocorrect undo), delete that

**Live partial insertion**:
Not supported. Partial transcripts appear only in the recorder window, never in the active text field.
_Avoid_: Streaming insert, live text

**Recorder startup**:
The recorder is not opened at login. The user may open it manually; if dictation starts while it is not running, the extension auto-launches it.
_Avoid_: Auto-start (except on-demand via dictation)

**Unsafe field**:
A sensitive input context such as a password or credit-card field. Dictation is blocked; autocorrect continues to run.
_Avoid_: Secure field, private field
