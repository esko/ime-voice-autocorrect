# ADR-001: Use a ChromeOS IME extension for text insertion

## Status

Accepted.

## Decision

Implement text insertion and autocorrect through a Manifest V3 ChromeOS IME extension using `chrome.input.ime`.

## Rationale

The product must work across ChromeOS applications, not only browser content pages. Content scripts cannot provide this. The ChromeOS IME API is explicitly for custom ChromeOS input methods and supports key handling, composition, candidate/assistive windows, surrounding text, deletion, and committing text.

## Consequences

- The user must select `Input Assist` as the active ChromeOS input method.
- The built-in US layout is not enhanced in place.
- The extension exposes one input method with one layout (`us::eng`).
- The API is ChromeOS-only and should be tested on the actual target Chromebook.
