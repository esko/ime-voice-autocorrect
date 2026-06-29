# Architecture

## Components

```text
ChromeOS Input Assist
└── apps/extension/                      Manifest V3 ChromeOS IME
    ├── Input Assist input method (`us::eng`)
    ├── active context tracking (focus/blur/surrounding text)
    ├── key handling (pass-through + boundary detection)
    ├── commit / delete text adapter
    ├── undo-on-backspace
    └── IME menu (autocorrect toggle)

packages/autocorrect-core/              pure engine, no chrome.* imports
    ├── tokenizer
    ├── SymSpell candidate generator
    ├── keyboard-neighbour scoring
    ├── ignore rules (code/url/email/identifiers)
    └── confidence / ranking / decision
```

## Responsibility split

**The IME extension owns** the active ChromeOS input context, key handling while
the IME is active, text insertion/replacement (`commitText` /
`deleteSurroundingText`), undo, surrounding-text tracking, and the IME menu. It
captures the token and context and calls the engine — it contains no spelling
logic itself.

**`autocorrect-core` owns** all language logic: tokenization, candidate
generation, scoring, confidence, and the replace/suggest/none decision. It is
Chrome-agnostic and unit-tested outside ChromeOS. **No `chrome.*` imports.**

## Typing / autocorrect flow

```text
1. User selects Input Assist.
2. IME receives the focus context (onFocus).
3. Normal keystrokes pass through (onKeyEvent returns false) and are tracked.
4. Recent text is tracked via key events and onSurroundingTextChanged.
5. On a word boundary, the engine evaluates the previous token.
6. If the engine returns `replace` (high confidence):
   a. deleteSurroundingText(previous token length)
   b. commitText(corrected token)
   c. record an undo entry
   d. show minimal assistive undo status
   If it returns `suggest`, show a candidate window (Phase 2).
   If `none`, do nothing.
7. Backspace immediately after a correction restores the original token.
```

## Key-event contract (important)

`chrome.input.ime.onKeyEvent` must return **`true` only for keys the IME
consumes**. Returning `true` for a normal key swallows it (nothing types). The
extension returns `false` (pass-through) for all normal typing, and `true` only
for a Backspace that triggers an autocorrect undo.

## Menu / engine activation

`setMenuItems` is only valid for the *currently active* engine. The extension
tracks the active engine (`onActivate` / `onDeactivated`) and repaints the menu
only when an engine is active.

## Data flow

```text
Keyboard + context events
  -> IME key/focus handlers (apps/extension)
  -> InputStateManager (token + context state)
  -> autocorrect-core engine.decide(token, ...)
  -> chrome.input.ime commit / delete / candidates

Settings / user dictionary
  -> options page / chrome.storage.local
  -> engine word lists + learned corrections
```

## Repo layout

```text
ime-voice-autocorrect/
├── AGENTS.md
├── CONTEXT.md
├── package.json
├── pnpm-workspace.yaml
├── apps/
│   └── extension/
│       ├── public/manifest.json
│       └── src/{background,bootstrap}.ts, ime/, autocorrect/, storage/, diagnostics/
├── packages/
│   └── autocorrect-core/
└── docs/
```

See `docs/autocorrect-engine-plan.md` for how the engine evolves.
