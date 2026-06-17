# AGENTS.md — Implementation Instructions

## Mission

Implement the full ChromeOS Input Assist stack described in this repository.

This project is for one user on ChromeOS. Do not spend effort on broad compatibility, other browsers, Android, Linux apps, Tabby, or web-page-only content scripts.

## Non-negotiable requirements

- Build a Manifest V3 ChromeOS IME extension.
- Build one recorder IWA.
- Expose two IME input methods:
  - `Input Assist US`
  - `Input Assist Finnish`
- Each IME entry must specify exactly one keyboard layout.
- Implement English-only autocorrect.
- Implement external streaming ASR dictation.
- Dictation control must be keyboard-first through the IME.
- Dictation output must insert automatically through the active IME context.
- The visible recorder UI must be a single tiny unframed/borderless IWA window.
- Do not implement a separate puck.
- Do not implement Tabby-specific support.
- Do not implement content-script insertion as an alternative architecture.
- Do not implement compatibility fallbacks.
- Do not build a legacy Chrome App.
- Do not require mouse clicks for normal dictation.

## Prior art requirement

Before writing dictation code, inspect `esko/tabby-voice-dictation`.

Port the architectural lessons, not the Tabby UI/injection specifics:

- Keep `DictationSession` framework-agnostic.
- Keep ASR protocol decoding pure and unit-tested.
- Keep mic/audio globals isolated to one audio adapter.
- Keep WebSocket/session globals isolated to one socket adapter.
- Keep transcript formatting and reconciliation pure.
- Keep UI status behind a small port.
- Replace Tabby `TerminalPort` with a ChromeOS `ImeTextPort`.

## Development style

Use strict TDD.

For each work item:

1. Write failing tests first.
2. Implement the smallest correct unit.
3. Run all relevant tests.
4. Refactor.
5. Update docs if behavior changed.

Prefer pure TypeScript modules for core logic so tests run outside ChromeOS where possible. Chrome API adapters should be thin and integration-tested separately on ChromeOS.

## Architecture rule

Separate pure logic from platform adapters:

```text
Pure core:
  autocorrect
  tokenization
  scoring
  transcript cleanup
  ASR protocol state machine
  dictation session state
  bridge protocol validation

Chrome/IWA adapters:
  chrome.input.ime wrapper
  chrome.runtime messaging wrapper
  IWA mic capture wrapper
  IWA window/status UI
  storage wrapper
```

## Test requirements

Every PR must include tests for:

- Unit-level core behavior.
- Protocol validation.
- Error/state transition behavior.
- Chrome adapter behavior using mocks.
- Manual ChromeOS acceptance steps if touching IME or IWA runtime.

## Preferred tooling

Use a TypeScript monorepo.

Recommended stack:

- `pnpm`
- `typescript`
- `vite`
- `vitest`
- `eslint`
- `prettier`
- `zod` for protocol/schema validation
- `fake-indexeddb` or storage mocks for local tests
- `playwright` only for browser-level UI tests where useful

## Fish shell note

All setup commands in docs should be fish-compatible. Avoid Bash-only snippets unless clearly marked.

## Commit/PR rules

- Use conventional commits.
- Keep PRs small but complete.
- Do not merge red tests.
- Do not leave TODOs for required first-release behavior.
- Do not create “later” or “post-MVP” work for known required functionality. If a requirement is too large, split it into first-release issues, not future scope.

## Source verification rule

Chrome/IWA/IME APIs are moving targets. When implementing platform adapters, verify behavior against current Chrome docs and on the target Chromebook. If docs and runtime differ, document the runtime behavior in `docs/platform-notes.md`.

## Agent skills

### Issue tracker

GitHub Issues on `esko/ime-voice-autocorrect` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles mapped to GitHub label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: `docs/adr/` for architectural decisions; `CONTEXT.md` at repo root when present. See `docs/agents/domain.md`.
