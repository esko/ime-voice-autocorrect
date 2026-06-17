# ADR-003: Use one tiny unframed IWA recorder window

## Status

Accepted.

## Decision

Build the recorder UI as one Isolated Web App window using unframed/borderless windowing.

## Rationale

The user wants a discreet, tiny, custom recorder surface and accepts experimental Chrome flags. IWA is a better fit than a normal PWA for ChromeOS-only personal use with experimental high-trust APIs and unframed windowing.

## Consequences

- The recorder IWA is not the text insertion component.
- The recorder IWA owns microphone capture, ASR streaming, settings, and status UI.
- The recorder IWA must not be treated as unfocusable or click-through.
- The IWA has one visible window only.
- There is no separate Document PiP puck.
