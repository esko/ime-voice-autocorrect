# ADR-002: Expose two IME input methods

## Status

Accepted.

## Decision

Expose two separate input components:

- `Input Assist US`
- `Input Assist Finnish`

Each input component specifies exactly one keyboard layout.

## Rationale

The user switches between US and Finnish keyboard layouts. ChromeOS input component documentation says ChromeOS supports one layout per input method and warns that if multiple layouts are specified, selection order is undefined.

## Consequences

- The user switches between assisted US/Finnish input methods instead of built-in US/Finnish layouts.
- Both engines share the same autocorrect/dictation core.
- English autocorrect remains enabled in both, but must be conservative with Finnish-looking tokens.
