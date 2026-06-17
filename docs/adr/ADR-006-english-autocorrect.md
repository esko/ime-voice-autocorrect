# ADR-006: English-only autocorrect

## Status

Accepted.

## Decision

Implement autocorrect for English only in the first complete release.

Autocorrect runs in both the US and Finnish IME entries, but must avoid changing Finnish-looking or technical tokens.

## Rationale

The user types English and also switches to a Finnish keyboard layout. Finnish spelling correction is significantly harder due to morphology and compound words. The required first release should provide safe English corrections without harming Finnish typing.

## Consequences

- Tokens with `å`, `ä`, or `ö` are never autocorrected.
- Unknown words are not auto-corrected unless confidence is high.
- Technical/code-like tokens are ignored.
- Personal dictionary and ignore list are required.
- Finnish autocorrect is explicitly out of scope.
