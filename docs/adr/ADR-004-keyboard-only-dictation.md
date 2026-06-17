# ADR-004: Keyboard-only dictation control

## Status

Accepted.

## Decision

Normal dictation control is performed through keyboard events captured by the active IME.

The recorder window is passive status UI during dictation. The only clickable control is an extras/menu button, and it is enabled only when idle.

## Rationale

A click in an IWA/PWA window can focus that window and blur the active text field. The IME context ID becomes invalid on blur. Chrome/IWA does not provide a known non-activating or click-through window API.

## Consequences

- Start/stop/cancel/finalize must be IME key chords.
- During active dictation:
  - hide or disable extras button
  - no draggable surface
  - no clickable main recorder surface
  - no transcript accept button
- Settings are accessed only when idle.
