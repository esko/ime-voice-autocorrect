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
- [ ] ChromeOS input settings list **Input Assist US** and **Input Assist Finnish**.
- [ ] Selecting one shows the IME menu (tray) with an **Autocorrect** toggle and
      no "engine is not active" error in the service-worker console.

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
- [ ] **US** layout: letters, numbers, `! ? . , ; : ' " ( )` all type correctly.
- [ ] **Finnish** layout: `å ä ö` type correctly; AltGr characters work.
- [ ] Backspace, arrows, Enter, Tab behave normally.
- [ ] Right Alt does nothing unusual (it is no longer a dictation key).

## 3. Core autocorrect (should auto-replace)

- [ ] type `teh ` → `the `
- [ ] type `recieve ` → `receive `
- [ ] type `seperate ` → `separate `
- [ ] type `definately ` → `definitely `
- [ ] type `becuase ` → `because `
- [ ] type `wich ` → `which `
- [ ] type `langauge ` → `language ` (this one needs the freq dict loaded — §1)
- [ ] Capitalisation is preserved: `Teh ` → `The `, `TEH ` → `THE `.

## 4. Context (previous words change the outcome)

- [ ] type `in teh ` → `in the `
- [ ] type `i went hpme ` → `… home ` (dictionary + context together)
- [ ] A correction that depends on context only fires once the corpus is loaded.

## 5. Real-word / confusion (should *suggest*, not silently replace)

- [ ] type `came form ` → a candidate window offers **from** (it does **not**
      auto-replace, because `form` is a real word).
- [ ] Pick the suggestion → the text becomes `came from `.
- [ ] type a plain correct sentence with `form`, `their`, `were` where they are
      correct → no candidate window appears.

## 6. Suggestions / candidate window

- [ ] A medium-confidence typo (e.g. type `becuse `) shows a candidate window
      with options (`because`, …) rather than auto-replacing.
- [ ] Selecting a candidate replaces the word + keeps the trailing space.
- [ ] Typing another character (instead of selecting) dismisses the window.

## 7. Learning (this should adapt to you)

- [ ] type `teh ` → it becomes `the `. Immediately press **Backspace** → it
      reverts to `teh` (undo).
- [ ] type `teh ` again → it is now **offered** (candidate window), no longer
      auto-applied. (One rejection demotes that exact correction.)
- [ ] Reload the extension, type `teh ` again → still not auto-applied (learning
      persisted to storage).
- [ ] Add a word via accepting a suggestion, then type it again → it is treated
      as known and not corrected.

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

## 10. Known soft spots (expected, not bugs)

- [ ] Short ambiguous typos may do nothing rather than guess: `wprd ` (word vs
      work) and `woord ` (word vs wood) are expected to be left alone for now.
      Note any that feel like they *should* have corrected — that real-world data
      is what we'd use to tune the thresholds.
- [ ] Note any **wrong** auto-replacements (the worst failure) — these matter most.

## What to report back

For anything off, jot: what you typed, what happened, the field type, and
whether the data had finished loading (§1). Wrong auto-replacements and swallowed
keystrokes are the highest priority.
