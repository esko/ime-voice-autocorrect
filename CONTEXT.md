# Input Assist

A ChromeOS autocorrect keyboard that provides one assisted US-layout IME entry
offering English autocorrect.

## Language

**Input Assist**:
The product name used in all everyday user-facing text — IME menu labels, status
messages, options page.
_Avoid_: ChromeOS Input Assist (except extension listing and install docs where
ChromeOS disambiguation is needed)

**Input Method**:
A ChromeOS IME entry the user selects from the system input picker. Input Assist
exposes exactly one, named Input Assist, mapped to `us::eng`.
_Avoid_: Layout, keyboard mode, input component (use in Chrome API context only)

**Autocorrect**:
English spell correction applied to typed input at word boundaries. A typed
token is corrected only when the engine's confidence is high enough; otherwise
candidates may be shown, or nothing happens.
_Avoid_: Spell check (broader)

**Token**:
The run of word characters the user has typed since the last boundary — the unit
the engine evaluates when a delimiter is typed.
_Avoid_: Word (ambiguous with dictionary word)

**Delimiter / boundary**:
The character (space, punctuation, enter) that ends a token and triggers the
correction decision.

**Candidate**:
A possible replacement for a token, produced by the SymSpell generator and
scored by the ranking layer. Each candidate carries edit distance, frequency,
and feature scores.

**Confidence**:
The margin-based measure of how much better the best candidate is than both the
original token and the second-best candidate. Drives the replace / suggest / do-
nothing decision. High confidence → replace; medium → suggest; low → nothing.
_Avoid_: Score (reserve for individual feature scores)

**Decision**:
The engine's output for a token: `replace`, `suggest`, or `none`.

**Undo-on-backspace**:
Pressing Backspace immediately after an automatic correction restores the
original token and (later) records the correction as rejected.
_Avoid_: Undo (qualify it; this is the backspace path specifically)

**User dictionary**:
User-accepted words and learned correction preferences kept in
`chrome.storage.local`. Words in it are treated as valid and never autocorrected.
_Avoid_: Personal dictionary (acceptable synonym in settings UI)

**Unsafe field**:
A sensitive or non-prose input context (password, url, email, number) or text
that looks like code/paths/identifiers. Autocorrect is bypassed entirely.
_Avoid_: Secure field, private field
