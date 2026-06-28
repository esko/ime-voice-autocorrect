# Requirements

## User goal

A discreet, fast ChromeOS typing aid. The user switches between US and Finnish
keyboard layouts; the product replaces those with assisted ChromeOS IME entries:

- `Input Assist US`
- `Input Assist Finnish`

It must work across ChromeOS applications through the ChromeOS input method
system, not only inside browser web pages.

## In scope

### IME extension

- Manifest V3 ChromeOS-only IME.
- Two `input_components` (US, Finnish), one layout each.
- Normal keystrokes pass through; the IME tracks recent text.
- Surrounding-text tracking via `onSurroundingTextChanged`.
- Text replacement via `deleteSurroundingText` + `commitText`.
- Undo-on-backspace immediately after a correction.
- Assistive undo UI where supported.
- IME menu for the autocorrect toggle / status.

### Autocorrect engine (`autocorrect-core`)

- English only; same engine for both IME entries.
- Word-level correction on a delimiter, not on every keystroke.
- SymSpell candidate generation + keyboard-typo-aware scoring.
- Margin-based confidence with three outcomes: replace / suggest / none.
- Conservative by default: a bad autocorrect is worse than none.
- User dictionary + learned correction preferences (`chrome.storage.local`).
- Bypass in unsafe fields and code/url/email/identifier-like text.
- Chrome-agnostic: no `chrome.*` imports.

See `docs/autocorrect-engine-plan.md` for the scoring model and phased plan.

## Out of scope

- Voice dictation (removed — recorder IWA, extension↔IWA bridge, ASR).
- Finnish autocorrect.
- LLM- or grammar-based correction.
- Content-script insertion, native helper app, legacy Chrome App.
- Android / Linux-Crostini integration.
- General cross-browser compatibility, fallback UI modes.

## Non-goals

- Do not use the clipboard as the normal insertion path.
- Do not autocorrect aggressively; prefer suggesting or doing nothing when
  confidence or margin is low.
- Do not run language logic in the extension layer; keep it in `autocorrect-core`.
