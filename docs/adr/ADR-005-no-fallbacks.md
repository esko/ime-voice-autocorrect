# ADR-005: No compatibility fallbacks

## Status

Accepted.

## Decision

Do not implement fallback architectures or UI modes for non-target browsers/platforms.

## Rationale

The project is for personal ChromeOS use. The user is willing to enable Chrome flags and use experimental APIs.

## Consequences

- No content-script insertion fallback.
- No normal PWA fallback if IWA/unframed cannot run.
- No legacy Chrome App fallback.
- No PiP fallback.
- No native helper.
- No Tabby-specific backend.
- Missing required Chrome flags should be a hard diagnostic failure.
