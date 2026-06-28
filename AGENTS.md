# AGENTS.md — Implementation Instructions

## Mission

Build a **ChromeOS autocorrect keyboard**: a Manifest V3 ChromeOS IME extension
that offers English autocorrect on US and Finnish layouts. This project is for
one user on ChromeOS. Do not spend effort on broad compatibility, other
browsers, Android, Linux apps, or web-page-only content scripts.

Voice dictation has been scoped out (recorder IWA, extension↔IWA bridge, and
ASR were removed). Do **not** reintroduce them unless explicitly asked. The
history remains in git if dictation is revived later.

## Current shape

- One MV3 ChromeOS IME extension (`apps/extension`).
- Two IME input methods: `Input Assist US` and `Input Assist Finnish`, each with
  exactly one keyboard layout.
- English-only autocorrect, applied at word boundaries, with undo-on-backspace.
- A reusable, Chrome-agnostic engine in `packages/autocorrect-core`.

## The plan of record

`docs/autocorrect-engine-plan.md` defines the engine vision, scoring model, and
the phased slices (Phase 1 = scoring/decision layer, then candidate UI, user
learning, Hunspell validator). Start there.

## Architecture rule

Keep pure logic separate from platform adapters. **No `chrome.*` imports in
`packages/autocorrect-core`** — the extension captures text and calls the engine.

```text
Pure core (packages/autocorrect-core):
  tokenization, SymSpell candidate generation, scoring, confidence, decision
Chrome adapters (apps/extension):
  chrome.input.ime wrapper, storage wrapper, menu/candidate UI
```

## Development style

Use strict TDD. For each work item: write failing tests first, implement the
smallest correct unit, run tests, refactor, update docs if behavior changed.
Prefer pure TypeScript modules so tests run outside ChromeOS; keep Chrome API
adapters thin and integration-tested separately on the device.

## Quality gates

All four must stay green (CI runs them): `pnpm typecheck`, `pnpm lint`,
`pnpm test`, `pnpm build`. Do not merge red.

## Tooling

pnpm monorepo: `typescript`, `vite`, `vitest`, `eslint`, `prettier`. Fish shell
is the default; keep doc commands fish-compatible.

## Commit/PR rules

- Conventional commits.
- Keep PRs small but complete; do not merge red tests.
- Do not leave TODOs for required behavior.

## Source verification rule

Chrome/IME APIs are moving targets. When implementing platform adapters, verify
against current Chrome docs and on the target Chromebook. If docs and runtime
differ, record the runtime behavior in `docs/platform-notes.md`.

## Agent skills

- **Issue tracker** — GitHub Issues on `esko/ime-voice-autocorrect` via `gh`.
  See `docs/agents/issue-tracker.md`.
- **Triage labels** — see `docs/agents/triage-labels.md`.
- **Domain docs** — `docs/adr/` for decisions; `CONTEXT.md` at repo root. See
  `docs/agents/domain.md`.
