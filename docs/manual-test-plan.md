# Manual ChromeOS test plan

Run on the target Chromebook after building and loading the extension.

## Setup

- [ ] Extension loaded from a ChromeOS-native path (not Linux files).
- [ ] Service worker registers without error.

## IME installation

- [ ] `Input Assist US` appears in ChromeOS input methods.
- [ ] `Input Assist Finnish` appears in ChromeOS input methods.
- [ ] Switching between them works.
- [ ] The IME menu shows the Autocorrect toggle (no "engine not active" error).

## Layout behavior

- [ ] US layout types letters/numbers/symbols correctly.
- [ ] Finnish layout types letters/numbers/symbols correctly.
- [ ] Finnish `å`, `ä`, `ö` work.
- [ ] Modifier keys behave normally.
- [ ] Typing is never swallowed (every keystroke appears).

## Autocorrect

- [ ] `teh ` becomes `the `.
- [ ] `recieve ` becomes `receive `.
- [ ] `definately ` becomes `definitely `.
- [ ] A valid but uncommon word is not silently replaced.
- [ ] Backspace immediately after a correction restores the original.
- [ ] A word in the user dictionary is never corrected.
- [ ] URL field is not corrected.
- [ ] Email field is not corrected.
- [ ] Password field is not corrected.
- [ ] Code-like tokens (camelCase, snake_case, paths, words with digits) are not
      corrected.
- [ ] Low-confidence cases show candidates or do nothing, never a wrong replace
      (once Phase 2 lands).

## Toggle / preferences

- [ ] Turning Autocorrect off via the IME menu stops corrections.
- [ ] The toggle state persists across service-worker restarts.
