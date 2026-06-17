# Manual ChromeOS test plan

Run this on the target Chromebook.

## Setup

- Required flags enabled.
- Extension loaded.
- IWA installed and running.
- IWA connected to extension.
- ASR API key configured.
- Microphone permission granted.

## IME installation

- [ ] `Input Assist US` appears in ChromeOS input methods.
- [ ] `Input Assist Finnish` appears in ChromeOS input methods.
- [ ] Switching between them works.
- [ ] Built-in US/Finnish can remain installed but are not required.

## Layout behavior

- [ ] US layout types letters/numbers/symbols correctly.
- [ ] Finnish layout types letters/numbers/symbols correctly.
- [ ] Finnish `å`, `ä`, `ö` work.
- [ ] Modifier keys behave normally.
- [ ] Right Alt / AltGr behavior is documented.

## Autocorrect

- [ ] `teh ` becomes `the `.
- [ ] `recieve ` becomes `receive `.
- [ ] `neessarily ` becomes `necessarily `.
- [ ] Finnish words containing `ä` are ignored.
- [ ] URL field is not aggressively corrected.
- [ ] Email field is not aggressively corrected.
- [ ] Password field disables dictation; autocorrect may continue.
- [ ] Backspace immediately after correction restores original.
- [ ] Personal dictionary prevents correction.
- [ ] Ignore list prevents correction.

## Dictation

- [ ] Recorder IWA shows idle.
- [ ] Dictation chord starts recording without clicking the IWA.
- [ ] Recorder IWA shows listening.
- [ ] Partial transcript appears only in recorder UI.
- [ ] Dictation chord stops/finalizes.
- [ ] Final transcript inserts into the active text field.
- [ ] `scratch that` / `undo` behaves as designed.
- [ ] Esc cancels session.
- [ ] Push-to-talk mode works.
- [ ] Toggle mode works.
- [ ] Key repeat does not create multiple sessions.

## Focus

- [ ] Clicking the recorder while idle opens extras/settings if clicking the icon.
- [ ] During active dictation, extras icon is hidden/disabled.
- [ ] During active dictation, main recorder surface does not expose controls.
- [ ] If focus is lost, unsafe commit is blocked/cancelled.
- [ ] Recorder is not required for normal operation except visual status.

## Bridge

- [ ] IWA initiates extension connection.
- [ ] Extension marks recorder available.
- [ ] Reloading IWA reconnects.
- [ ] Closing IWA marks recorder unavailable.
- [ ] Start/stop/cancel messages round trip.
- [ ] Invalid session messages are ignored.

## ASR

- [ ] Mic capture starts.
- [ ] RMS level updates.
- [ ] Noise gate can be enabled/disabled.
- [ ] Provider token fetch succeeds.
- [ ] WebSocket opens and waits for session started.
- [ ] Stop flush captures final words.
- [ ] Transient disconnect reconnects.
- [ ] Exhausted reconnect shows error.
- [ ] API key is redacted from logs/debug bundle.
