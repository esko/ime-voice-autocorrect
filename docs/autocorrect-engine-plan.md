# Autocorrect engine plan

The product is now a **ChromeOS autocorrect keyboard** — dictation has been
scoped out (see the pivot note at the bottom). This document is the plan of
record for evolving the autocorrect engine. It is written to be executed from a
fresh context: read this top-to-bottom and you have everything needed to start
Phase 1.

## Guiding principle

> For a typing aid, **a bad autocorrect is much worse than no autocorrect.**

Replace a word only when the top candidate is clearly better than *both* the
original word and the second-best candidate. Otherwise show candidates, or do
nothing.

## Architecture (already in place)

```
ChromeOS IME extension  (apps/extension)        thin chrome.input.ime wrapper
        ↓                                        captures text, calls engine,
local autocorrect engine (packages/autocorrect-core)   commits / suggests
        ↓
SymSpell candidate generator   →  (future) Hunspell/nspell validator
        ↓
confidence / ranking layer
        ↓
commit replacement | show candidates | do nothing
```

The engine is **Chrome-agnostic** and must stay that way: no `chrome.*` imports
in `packages/autocorrect-core`. The extension captures the token + delimiter +
surrounding text, calls `engine.decide(...)`, then commits or shows candidates.

## What already exists in `autocorrect-core`

- `symspell.ts` — SymSpell candidate generator (symmetric-delete index,
  Damerau–Levenshtein, frequency-sorted, keyboard-neighbour tiebreak). Known
  words return no candidates (exact-match protection).
- `keyboardNeighbors.ts` — QWERTY neighbour map + scoring (currently a
  tiebreaker, not a weighted feature).
- `dictionary.ts` / `coreEnglishDictionary.ts` / `dictionaryLoader.ts` —
  frequency dictionary.
- `ignoreRules.ts` — code/url/email/camelCase/snake_case/ALL_CAPS/digit bypass.
- `tokenizer.ts` — `extractLastWord`, `isWordBoundary`.
- `confidence.ts` — current decision: single `best.freq / second.freq` ratio.
- `autocorrectEngine.ts` — `correctToken()` returns `unchanged | corrected`.

The extension wrapper (`apps/extension`) already does word-level correction on
the delimiter and undo-on-backspace, against this engine.

## Target decision contract

Replace the binary `correctToken` with a richer, still-pure API:

```ts
type CorrectionDecision =
  | { action: "none" }
  | { action: "suggest"; candidates: RankedCandidate[] }
  | { action: "replace"; original: string; replacement: string;
      confidence: number; candidates: RankedCandidate[] };

interface DecideInput {
  word: string;             // the token before the delimiter
  delimiter: string;        // the boundary char just typed
  leftContext?: string;     // surrounding text before the caret (<=100 chars)
  fieldType?: string;       // chrome.input.ime context type
  autoCorrect?: boolean;    // context.autoCorrect flag
}
```

## Accessibility: emphasise neighbour-key typos

The user has motor difficulties and frequently hits **neighbouring keys, extra
keys, and doubled keys**. The scorer is therefore tuned to treat these as the
most plausible mistakes and correct them readily:

- neighbouring-key substitution scores high (`1.5` each), far substitutions are
  penalised (`-0.7`);
- doubled keys (tremor bounce) and inserted adjacent keys (fat-finger) score
  highly (`1.3` / `1.2`);
- words of length 4+ allow edit distance 2 so multi-key slips (e.g. two
  neighbouring substitutions at once) stay correctable.

Keep this emphasis in mind when tuning: prefer raising keyboard-plausibility for
the right typos over lowering global thresholds, which would over-correct.

## Scoring model

Each candidate carries weighted features summed into one total:

```
totalScore =
    frequencyScore          // log10(count+1) * w
  + editDistanceScore       // length-aware; 0→2.0, 1→1.5, 2(len>=5)→0.7, else −2
  + keyboardTypoScore       // transpose/neighbour-substitute/drop/insert ops
  + contextScore            // bigram(prevWord, candidate) — Phase 3+
  + userLearningScore       // accepted/rejected correction pairs — Phase 3
  + caseShapeScore          // case-pattern match
  − safetyPenalty           // valid-original, code/url/email, digits, etc.
```

Length-aware edit-distance caps:

```
length 1–2 : never autocorrect
length 3–4 : max edit distance 1
length 5–8 : max edit distance 2
length 9+  : max edit distance 2 (3 only for suggestions, never auto-replace)
```

## Confidence = margin, not absolute score

```
marginOverOriginal = best.total − originalScore
marginOverSecond   = best.total − (second?.total ?? −Infinity)
confidence         = sigmoid(min(marginOverOriginal, marginOverSecond) − 1.2)
```

Decision thresholds (starting values, tune later):

```
AUTO_REPLACE_THRESHOLD     = 0.85
SUGGEST_THRESHOLD          = 0.55
MIN_MARGIN_OVER_ORIGINAL   = 1.5
MIN_MARGIN_OVER_SECOND     = 0.8

replace  when confidence ≥ 0.85 AND both margins met AND not dangerous context
suggest  when confidence ≥ 0.55
none     otherwise
```

If the original word is valid (Hunspell / user dictionary), add a large penalty
(~3.0) so valid words are essentially never auto-replaced — only suggested.

## Slices

### Phase 1 — Scoring & decision layer (no new deps) ✅ done
Pure `autocorrect-core` work; keeps the build green throughout.
- Add a `RankedCandidate` model and a weighted scorer (frequency, length-aware
  edit distance, keyboard-typo ops, case shape, safety penalty).
- Add margin+sigmoid `confidence()`.
- Add `decide(): none | suggest | replace`, with strict empty-candidate guards.
- Add `restoreCase(original, candidate)`.
- Keep `correctToken` as a thin wrapper over `decide` (or migrate the extension).
- Unit tests for the worked examples: `teh→the` (replace), `recieve→receive`
  (replace), `form→from` (suggest/none — both valid), 1–2 char words (none),
  code/url/password contexts (none).
**Done when:** `decide` is fully unit-tested and `autocorrect-core` gates pass.

### Phase 2 — Wire `suggest` into the IME ✅ done
- Extend the extension wrapper to call `decide`; on `replace` do the
  delete+commit (as today), on `suggest` call `chrome.input.ime.setCandidates`
  / the candidate window; on `none` do nothing.
- Handle candidate selection → commit.
**Done when:** medium-confidence tokens show a candidate window instead of
silently replacing.

### Phase 3 — User learning ✅ done
- Track accepted / rejected correction pairs + accepted words in
  `chrome.storage.local`.
- Backspace-immediately-after-autocorrect → undo **and** increment the rejection
  count for `original→replacement`.
- Feed `userLearningScore` and a tiny bigram `contextScore` into the scorer.
**Done when:** a rejected correction stops being auto-applied; an accepted one
is reinforced. ✅ A bounded bigram `contextScore` is also in: `InputStateManager`
tracks the previous word from surrounding text and feeds it to `decide()`, which
reranks candidates against a seed bigram table (`createCommonBigrams`).

### Phase 4 — Hunspell/nspell validator (deliberate dependency step) ✅ done
- Add `nspell` + a `wooorm/dictionaries` en_US Hunspell dictionary as the
  *validator*: SymSpell generates candidates, Hunspell validates them, and
  validates the original word (strong original-word protection).
- Decide how to bundle the dictionary data into the MV3 service worker (size).
**Done when:** valid-but-uncommon words are protected and candidate quality
improves, with the engine still Chrome-agnostic. ✅ The engine defines a pure
`Validator` interface (original-word protection + candidate filtering). The
extension wraps nspell over the `dictionary-en` Hunspell dictionary, which ships
as a packaged file (`public/dictionary/`, copied from the dep at build time, not
committed) and is fetched by the service worker on start; the engine upgrades its
validator once it loads (`app.setValidator`).

## Non-goals (for now)

No LanguageTool, no LLM completion, no grammar / full-sentence rewriting. They
are heavier, add latency/privacy cost, and are not needed for the core keyboard
loop. Revisit only after Phases 1–4 are solid.

## Beyond the core loop

Phases 1–4 are done. The longer-term direction (weighted edit distance, larger
n-gram reranker, confusion-set real-word correction, Finnish via Voikko, and
opt-in neural/LLM correction off the critical path) is laid out in
`docs/future-roadmap.md`.

## Pivot note

This repo originally specified a combined autocorrect + voice-dictation system
(recorder IWA, extension↔IWA bridge, ElevenLabs ASR). Dictation was scoped out
to ship a reliable autocorrect keyboard first. The dictation/recorder/bridge/ASR
code and its docs were removed; the history remains in git if dictation is
revived later.
