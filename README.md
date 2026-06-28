# ChromeOS Input Assist

A personal **ChromeOS autocorrect keyboard**: a Manifest V3 ChromeOS IME
extension that offers English autocorrect on US and Finnish layouts.

- Two IME input methods — `Input Assist US` and `Input Assist Finnish` — each
  mapped to one keyboard layout.
- English autocorrect applied at word boundaries, with undo-on-backspace.
- A reusable, Chrome-agnostic autocorrect engine
  (`packages/autocorrect-core`): SymSpell candidate generation + a
  confidence/ranking layer. The extension is a thin `chrome.input.ime` wrapper.

> Scope note: voice dictation (recorder IWA, extension↔IWA bridge, ASR) was part
> of an earlier design and has been removed. See `docs/autocorrect-engine-plan.md`.

## Layout

```
apps/extension            MV3 ChromeOS IME extension (the keyboard)
packages/autocorrect-core  pure autocorrect engine (no chrome.* imports)
docs/                      plan, architecture, ADRs, install + test notes
```

## Develop

```fish
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Load `apps/extension/dist` as an unpacked extension and add `Input Assist US` /
`Input Assist Finnish` in ChromeOS input settings. See
`docs/chromeos-install-and-flags.md` for the install steps and
`docs/manual-test-plan.md` for on-device checks.

## Where to start

- `docs/autocorrect-engine-plan.md` — the engine vision, scoring model, and the
  phased build plan (Phases 1–4 done).
- `docs/future-roadmap.md` — where the engine goes next (weighted edit distance,
  n-gram reranking, confusion sets, Finnish/Voikko, opt-in neural).
- `AGENTS.md` — working agreement and architecture rules.
- `CONTEXT.md` — domain language.
- `docs/adr/` — architecture decisions.
