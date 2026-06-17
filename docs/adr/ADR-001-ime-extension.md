# ADR-001: Use a ChromeOS IME extension for text insertion

## Status

Accepted.

## Decision

Implement text insertion and autocorrect through a Manifest V3 ChromeOS IME extension using `chrome.input.ime`.

## Rationale

The product must work across ChromeOS applications, not only browser content pages. Content scripts cannot provide this. The ChromeOS IME API is explicitly for custom ChromeOS input methods and supports key handling, composition, candidate/assistive windows, surrounding text, deletion, and committing text.

## Consequences

- The user must select `Input Assist US` or `Input Assist Finnish` as the active ChromeOS input method.
- Built-in US/Finnish layouts are not enhanced in place.
- The extension must define separate input methods because ChromeOS supports one layout per input method.
- The API is ChromeOS-only and should be tested on the actual target Chromebook.
