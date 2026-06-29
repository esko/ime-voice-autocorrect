# ADR-007: Expose one Input Assist input method

## Status

Accepted.

## Decision

Expose one ChromeOS input component named `Input Assist`, with id
`input-assist` and layout `us::eng`.

## Rationale

On-device use showed that two assisted US/Finnish entries added unnecessary
picker complexity. The product was explicitly simplified to one US-layout IME
in commit `2102bee`. Built-in layouts remain available separately in ChromeOS.

## Consequences

- ADR-002 is superseded.
- The manifest, install instructions, tests, and user-facing docs refer to one
  `Input Assist` method.
- Finnish autocorrect and an assisted Finnish layout remain out of scope.
