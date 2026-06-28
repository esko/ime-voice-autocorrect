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
| 2 | Keyboard-aware error model | ◑ as a **scoring** feature (`keyboardTypoScore`: neighbour/transpose/doubled/inserted), not yet a weighted edit-distance in candidate generation |
| 3 | N-gram language-model reranking | ◑ bounded **bigram** reranker with a seed table (`createCommonBigrams`); trigram + larger corpus still to come |
| 4 | Confusion-set / real-word correction | ✗ not yet (we do have original-word protection: valid words are never auto-replaced) |
| 5 | Personal learning model | ✅ done (accept/reject pairs, accepted words, persisted) |
| 6 | Small neural correction model | ✗ future, opt-in only |
| 7 | Finnish morphology (Voikko) | ✗ future, separate track |

The decision pipeline today: SymSpell candidates → Hunspell validation +
original protection → weighted scoring (frequency, length-aware edit distance,
keyboard-typo ops, case shape) + user learning + bigram context → margin-based
confidence → replace / suggest / none.

## Near-term (high value, low risk)

Ordered by value-for-effort. All are offline, explainable, and engine-local.

1. **Expand the n-gram reranker (Level 3).** This is the strongest practical
   upgrade. Grow the bigram seed table into a compressed bigram/trigram table
   (or a KenLM-style model compiled to WASM later). Add right-context
   (next word) when available from surrounding text. Keep the bounded
   `contextScore` shape so context disambiguates without dominating.

2. **Confusion-set real-word correction (Level 4).** Catch valid-word mistakes
   (`form`/`from`, `their`/`there`, `its`/`it's`, `were`/`we're`). Hard rules:
   real-word swaps are **suggest-only by default**, and auto-replace **only**
   after the user has accepted that specific swap (ties into Level 5). Gate
   entirely on strong context (Level 3). This is where generic autocorrect feels
   hostile — do it conservatively.

3. **Extra candidate sources.** Union into the same ranker, then let the
   confidence layer decide:
   - Hunspell `suggest()` as a fallback when SymSpell yields few candidates.
   - Mine the `.aff` `REP`/`MAP`/`PHONE`/`KEY` rules for extra signals
     (common replacements, similar characters, phonetic, keyboard hints).
   - A small hand-written hard-typo map for stubborn cases.

4. **True weighted edit distance (Level 2 refinement).** Today keyboard
   plausibility is a post-hoc score; optionally fold it into the distance metric
   itself (adjacent-key sub ≈ 0.35, transpose ≈ 0.25, doubled-char delete ≈
   0.25, far sub ≈ 1.0). Highest-value for the motor-difficulty profile — it
   models real finger errors, not dictionary distance. See
   [[user-motor-difficulty-typing]].

5. **Phonetic candidates (lower priority).** Metaphone/Double Metaphone as an
   extra candidate source for sound-based slips (`fone→phone`, `nite→night`).
   Rerank with the same confidence model. Below keyboard distance in priority.

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
