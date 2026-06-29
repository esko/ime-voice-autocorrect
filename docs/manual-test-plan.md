# Manual ChromeOS test plan

On-device verification for the autocorrect keyboard. Work through it after
building and loading the extension. `[ ]` = check; **type** = what to type,
**→** = expected result. Type in a normal text field (e.g. a Docs/Notes/address
bar) unless a row says otherwise. A trailing space after a word is what triggers
correction, so "type `teh `" means type `teh` then space.

## 0. Build & install

```fish
pnpm build
```

- [ ] Load `apps/extension/dist` as an unpacked extension from a **ChromeOS-native
      path** (copy `dist` into My files → Downloads first; loading from Linux
      files makes the service worker fail to fetch).
- [ ] `chrome://extensions` shows no error on the card ("Service worker
      (inactive)" is normal).
- [ ] ChromeOS input settings list a single **Input Assist** input method.
- [ ] Selecting it shows the IME menu (tray) with **Autocorrect**, **Correct in
      terminals & code fields**, and **Manage learned corrections…**, with no
      "engine is not active" error in the service-worker console.

## 1. Data loads (the engine upgrades a few seconds after first use)

The worker fetches its dictionary + corpus + frequency list on first activity.
Open the service-worker console (`chrome://extensions` → service worker →
inspect) and the Network tab.

- [ ] After selecting the IME and typing once, Network shows successful fetches
      of `dictionary/en.aff`, `dictionary/en.dic`, `ngrams/en-freq.txt`,
      `ngrams/en-bigrams.txt`, `ngrams/en-trigrams.txt`.
- [ ] No uncaught errors in the console.
- [ ] Give it ~2–3 s after first keystroke before judging the richer cases in
      §4–6 (before that, only the most common typos correct).

## 2. Typing is never broken

- [ ] type a full sentence normally → every character appears, nothing is
      swallowed or doubled.
- [ ] Letters, numbers, `! ? . , ; : ' " ( )` all type correctly (US layout).
- [ ] Backspace, arrows, Enter, Tab behave normally.
- [ ] Right Alt does nothing unusual (it is no longer a dictation key).

## 3. Core autocorrect (should auto-replace)

- [ ] type `teh ` → `the ` — and the **trailing space is preserved** (no need to
      press space twice).
- [ ] type `recieve ` → `receive `
- [ ] type `seperate ` → `separate `
- [ ] type `definately ` → `definitely `
- [ ] type `becuase ` → `because `
- [ ] type `wich ` → `which `
- [ ] type `langauge ` → `language ` (this one needs the freq dict loaded — §1)
- [ ] type `nite ` → `night ` (curated phonetic spelling)
- [ ] Motor-slip reach: `jwtboard `, `ekbyaord `, `kkeeyyboard ` → `keyboard `;
      `bokeper ` → `bookkeeper ` (these need the freq dict loaded — §1).
- [ ] Capitalisation is preserved: `Teh ` → `The `, `TEH ` → `THE `.
- [ ] Accidental-shift typos still correct: `tEh ` → `the `, `TEH ` → `THE `
      (these used to be ignored as "code"). Real code is still left alone (§8).

## 4. Context (previous words change the outcome)

- [ ] type `in teh ` → `in the `
- [ ] type `i went hpme ` → `… home ` (dictionary + context together)
- [ ] A correction that depends on context only fires once the corpus is loaded.

## 5. Real-word / confusion (should *suggest*, not silently replace)

- [ ] type `came form ` → a candidate window offers **from** (it does **not**
      auto-replace, because `form` is a real word).
- [ ] Pick the suggestion → the text becomes `came from `.
- [ ] **Even after** accepting `form`→`from` above, a real-word swap is *never*
      silently auto-applied later — it is always only offered. (Auto-replacing a
      correctly-spelled word is the worst failure, so it is suggest-only.)
- [ ] type a plain correct sentence with `form`, `their`, `were` where they are
      correct → no candidate window appears.
- [ ] type `school principle `, `know weather `, `walked passed `, `right hear `,
      and `at piece ` → the context-appropriate alternative is offered, never
      silently applied.

## 6. Suggestions / candidate window

- [ ] A medium-confidence typo (e.g. type `becuse `) shows a candidate window
      with options (`because`, …) rather than auto-replacing.
- [ ] Selecting a candidate **with the mouse** replaces the word + keeps the space.
- [ ] Selecting a candidate **with a number key** (`1`–`5`) does the same — the
      digit picks the candidate, it is not typed into the field.
- [ ] Typing another (non-digit) character instead dismisses the window.

## 7. Learning (this should adapt to you)

- [ ] type `teh ` → it becomes `the `. Immediately press **Backspace** → it
      reverts to `teh` (undo).
- [ ] type `teh ` again → it is now **offered** (candidate window with several
      options), no longer auto-applied. (One rejection demotes that exact
      correction — so if `teh` "suddenly only suggests", check whether you undid
      it earlier; clearing learned data resets it.)
- [ ] Reload the extension, type `teh ` again → still not auto-applied (learning
      persisted to storage).
- [ ] Add a word via accepting a suggestion, then type it again → it is treated
      as known and not corrected.
- [ ] Open **Manage learned corrections…** from the IME menu. Re-enable the
      rejected `teh → the` pair → the next `teh ` auto-corrects again without
      reloading the extension.

## 8. Safety — must NOT correct

- [ ] **Password** field: type `teh ` → stays `teh`.
- [ ] **URL/address bar**: type `teh ` → stays `teh`.
- [ ] **Email** field: `teh ` stays `teh`.
- [ ] Code-like tokens stay untouched: `fooBar `, `snake_case `, `API_KEY `,
      `node_modules `, `v2.3 `, `https://x.io `.
- [ ] A correctly-spelled word is never replaced: type `the `, `cat `, `form ` →
      unchanged.
- [ ] 1–2 letter tokens are never corrected: `ab `, `to `.

## 9. Toggle / preferences

- [ ] IME menu → turn **Autocorrect off** → corrections stop (typing still works).
- [ ] Turn it back on → corrections resume.
- [ ] Reload the extension → the toggle state is remembered.

## 10. Terminal / opted-out fields

- [ ] With **Correct in terminals & code fields** off (default), type `teh ` in
      ChromeOS Terminal → it stays unchanged and never duplicates text.
- [ ] Turn the setting on and type `teh ` in Terminal → synthetic Backspaces
      remove the original token and commit `the ` exactly once.
- [ ] Reload the extension → the terminal/code-field toggle state is remembered.
- [ ] Turn the setting off again after testing; shell commands and paths should
      not normally be autocorrected.

## 11. Known soft spots (expected, not bugs)

- [ ] Short ambiguous typos may do nothing rather than guess: `wprd ` (word vs
      work) and `woord ` (word vs wood) are expected to be left alone for now.
      Note any that feel like they *should* have corrected — that real-world data
      is what we'd use to tune the thresholds.
- [ ] Note any **wrong** auto-replacements (the worst failure) — these matter most.

## What to report back

For anything off, jot: what you typed, what happened, the field type, and
whether the data had finished loading (§1). Wrong auto-replacements and swallowed
keystrokes are the highest priority.
