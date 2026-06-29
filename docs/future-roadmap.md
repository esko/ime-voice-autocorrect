# Future roadmap

Where the autocorrect engine can go after the core loop. This follows a
deliberate "layers you add gradually" path; the guiding rule from the engine
plan still holds: **a bad autocorrect is worse than none**, and nothing slow or
unpredictable goes in the keystroke-critical path.

The target sweet spot is **Levels 1–5**. Neural/LLM correction is useful, but
only off the critical path (hotkey / sentence end / selected text).

## Where we are today

| Level | Capability | Status |
|---|---|---|
| 1 | SymSpell candidate generation + nspell/Hunspell validation | ✅ done |
| 2 | Keyboard-aware error model | ✅ `keyboardTypoScore` plus `weightedKeyboardDistance`; the generator performs bounded on-demand keyboard expansion so long raw-distance-3 typos with weighted cost ≤1.2 are reachable without enlarging the persistent index |
| 3 | N-gram language-model reranking | ✅ trigram→bigram backoff reranker; full ~242k-pair English bigram corpus bundled and loaded at start (`loadEnglishContext`) |
| 4 | Confusion-set / real-word correction | ✅ context-gated and always suggestion-only (`createCommonConfusionSets`), backed by the bundled full bigram corpus |
| 5 | Personal learning model | ✅ done (accept/reject pairs, accepted words, persisted) |
| 6 | Small neural correction model | ✗ future, opt-in only |
| 7 | Finnish morphology (Voikko) | ✗ future, separate track |

The decision pipeline today: SymSpell candidates → Hunspell validation +
original protection → weighted scoring (frequency, length-aware edit distance,
keyboard-typo ops, case shape) + user learning + bigram context → margin-based
confidence → replace / suggest / none.

## Bundled data + offline eval

The engine is data-driven from packaged files the service worker fetches and
applies at start (`app.setDictionary` / `setValidator` / `setContext`):

- `public/ngrams/en-freq.txt` — 30k Hunspell-filtered Norvig unigram
  frequencies (the candidate source + frequency ranking). **This replaced a
  232-word built-in stub that crippled real-vocabulary correction** — found by
  the offline harness below.
- `public/dictionary/en.{aff,dic}` — Hunspell dictionary (validator), copied
  from the `dictionary-en` dep at build time.
- `public/ngrams/en-{bi,tri}grams.txt` — context corpora.

`apps/extension/scripts/eval.mjs` runs the **real engine against the real
bundled data** on sample sentences — the fastest way to sanity-check behaviour
without a device. Regenerate data with `scripts/build-ngrams.mjs`.

Known limitation: short tokens with a close high-frequency real-word alternative
(e.g. `wprd` between *word*/*work*, `woord` between *word*/*wood*) are
conservatively left alone rather than suggested. Best tuned with real on-device
typing data, not synthetic cases.

## Near-term (high value, low risk)

Ordered by value-for-effort. All are offline, explainable, and engine-local.

1. **Expand the n-gram reranker (Level 3).** ✅ The full English bigram corpus
   (~242k lowercase word pairs from Norvig's web-corpus counts) is bundled as a
   packaged file and loaded by the service worker on start (`loadEnglishContext`
   → `app.setContext`); the seed table is the fallback until it loads. Regenerate
   with `node scripts/build-ngrams.mjs` (needs network; output is committed).
   A trigram corpus is also bundled (orgtre Google-Books top-3000;
   `en-trigrams.txt`), so the trigram→bigram backoff is data-backed. **Preferred
   upgrade:** subs2vec's subtitle-based English trigram counts (larger, closer to
   real typing) — its host (`archive.mpi.nl`) blocks automated downloads, so
   download the English OpenSubtitles "trigram counts" file by hand and run
   `node scripts/build-ngrams.mjs path/to/that-file`. Right-context is now wired:
   when surrounding text exposes a word after the caret, its candidate→next-word
   bigram participates in the same bounded score. A KenLM-style WASM model is a
   possible future replacement for the table-backed scorer.

2. **Confusion-set real-word correction (Level 4).** ✅ A curated confusion
   table (`createCommonConfusionSets`) is consulted only when the original is a
   real word. A context-supported swap is **always suggestion-only**, even when
   previously accepted, because silently replacing a valid word is the worst
   failure class. The bundled full bigram corpus drives the context gate; the
   set now includes common grammar pairs and homophones such as
   principal/principle, weather/whether, passed/past, hear/here, and peace/piece.
   Further additions are ordinary data tuning, not a missing engine capability.

3. **Extra candidate sources.** Union into the same ranker, then let the
   confidence layer decide:
   - ✅ Hunspell `suggest()` fallback when SymSpell + the frequency list find
     nothing (`Validator.suggest`, gated to edit distance ≤ 3, scored the same
     way so keyboard/context ranking still applies).
   - ✅ Mine the `.aff` `REP` rules (`createRepRulesFromAff`): the dictionary's
     curated phonetic/spelling replacements (`f`↔`ph`, `gh`↔`f`, `tion`↔`sion`,
     anchored `^`/`$` rules) become an extra candidate source in the same
     empty-pool fallback as Hunspell `suggest()`, so slips SymSpell's keyboard
     model cannot reach (`telefone→telephone`, `fotographer→photographer`) get
     corrected — still filtered to real words and gated by the same confidence
     margins. Remaining `MAP`/`PHONE`/`KEY` rules are a later signal source.
   - ✅ A curated hard-typo map (`createCommonHardCorrections`): ~80 common
     misspellings corrected with high confidence, respecting user rejections and
     unsafe fields.

4. **True weighted edit distance (Level 2 refinement).** ✅ `weightedKeyboardDistance`
   is a keyboard-cost Damerau-Levenshtein (neighbour sub 0.4, transpose 0.3,
   doubled/brushed indel 0.3–0.6, far sub/indel 1.0). It grades distance-2
   corrections in `editDistanceScore` — a two-adjacent-key slip (weighted ≈ 0.8)
   is rewarded, two unrelated edits (weighted ≈ 2.0) are penalised — so motor
   typos correct readily while coincidental distance-2 collisions stay safe.
   Candidate generation now widens on demand for long raw-distance-3 tokens by
   reversing one cheap keyboard operation (neighbour substitution,
   transposition, bounced/adjacent extra key, or dropped double), then querying
   the existing distance-2 index. The final weighted-cost gate (≤1.2) rejects
   unrelated three-edit collisions. This reaches three neighbouring keys,
   transpositions, bounced keys, and dropped doubles without a much larger
   persistent SymSpell index. Cost tuning against real on-device typing remains
   ongoing rather than a separate implementation gap.

5. **Phonetic candidates (lower priority).** ✅ A bounded Double Metaphone index
   supplies up to eight frequency-ranked candidates when the stronger SymSpell
   pool is empty. Candidates still require dictionary validation, raw edit
   distance ≤3, and the normal confidence margins. It deliberately does not
   join a non-empty spelling pool because broad phonetic codes collapse words
   such as *not*, *note*, and *night* and weaken safer decisions. Common
   non-word phonetic spellings such as `nite→night` remain in the curated hard
   map; Hunspell REP rules cover transformations such as `fone→phone`.

## Mid-term

- **Richer personalization (Level 5+).** Learn motor-error *patterns* (e.g.
  habitual letter swaps, dropped final letters), per-app/site word frequencies,
  and user bigrams/trigrams. Feed them into the same scorer.
- **Trie + Levenshtein automaton / BK-tree.** Alternative candidate search;
  mainly worthwhile when adding **autocomplete** (prefix-aware completion), not
  just correction.

## Finnish (its own track, Level 7)

Plain Hunspell is weak for Finnish (huge inflection + compounding). Use **Voikko**
(morphological analysis + spell/grammar/hyphenation) as the Finnish validator and
analyser, with a Finnish-specific typo model, compound handling, and lemma-aware
ranking. Rust/WASM Voikko packagings exist but must be proven inside an MV3
ChromeOS IME before relying on them. The English and Finnish paths share the same
ranking/confidence core; only candidate generation and validation differ.

## Later / opt-in only — never in the keystroke path

- **Neural correction (Level 6)** (NeuSpell / ByT5 / small seq2seq): run on a
  hotkey ("fix last sentence"), at sentence end (background suggestion), or on
  selected text — never per keystroke. Adds latency, size, and overcorrection
  risk.
- **Local LLM** for sentence-level grammar/punctuation/style and multilingual
  cleanup: same policy — hotkey or selected text only, fully offline. The
  per-word engine must stay deterministic so typing never feels unstable.

## Principles (carry these forward)

- **Noisy-channel framing.** Rank by `P(candidate in context) × P(typo |
  candidate)`: context model (Level 3) × keyboard error model (Level 2), gated by
  the confidence layer. SymSpell is just the candidate generator.
- **Real-word edits are suggest-only** until the user teaches otherwise.
- **Offline & private.** All correction logic stays local; no network, no
  telemetry. (LLM/neural, if ever added, must also run locally.)
- **Keep the engine Chrome-agnostic.** New layers go in `packages/autocorrect-core`
  behind small interfaces (like `Validator` and `BigramModel`); the extension
  stays a thin IME wrapper.

## References

- KenLM (n-gram LM): https://github.com/kpu/kenlm
- JamSpell (context 3-gram corrector — copy the architecture, not the dep):
  https://github.com/bakwc/JamSpell
- NeuSpell (neural spelling correction): https://arxiv.org/abs/2010.11085
- Voikko (Finnish linguistics): https://voikko.puimula.org/
- Hunspell `.aff` REP/MAP/PHONE/KEY: https://man.archlinux.org/man/hunspell.5.en
