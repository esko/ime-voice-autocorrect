// End-to-end smoke test of the autocorrect engine against the REAL bundled data
// (Hunspell dictionary + bigram/trigram corpus + confusion + hard map). Run:
//
//   node scripts/copy-dictionary.mjs   # once, to materialise the dictionary
//   node scripts/eval.mjs
//
// This is a manual eval harness, not part of the test suite.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import nspell from "nspell";
// Import the built engine directly (plain node can't load the TS workspace src).
// Run `pnpm --filter @input-assist/autocorrect-core build` first.
import {
  createAutocorrectEngine,
  loadDictionaryFromText,
  createNgramContext,
  createCommonConfusionSets,
  createCommonHardCorrections,
  createRepRulesFromAff,
  UserModel,
} from "../../../packages/autocorrect-core/dist/index.js";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(appDir, path), "utf8");

// Validator from the bundled Hunspell dictionary.
const spell = nspell(read("public/dictionary/en.aff"), read("public/dictionary/en.dic"));
const validator = { isValid: (w) => spell.correct(w), suggest: (w) => spell.suggest(w) };

// Context from the bundled corpora.
function parseTable(path) {
  const out = {};
  for (const line of read(path).split("\n")) {
    const tab = line.indexOf("\t");
    if (tab < 0) continue;
    const key = line.slice(0, tab);
    const count = Number(line.slice(tab + 1));
    if (key && Number.isFinite(count)) out[key] = count;
  }
  return out;
}
const context = createNgramContext({
  bigrams: parseTable("public/ngrams/en-bigrams.txt"),
  trigrams: parseTable("public/ngrams/en-trigrams.txt"),
});

const engine = createAutocorrectEngine({
  dictionary: loadDictionaryFromText(read("public/ngrams/en-freq.txt"), 2),
  validator,
  context,
  confusion: createCommonConfusionSets(),
  hardCorrections: createCommonHardCorrections(),
  repRules: createRepRulesFromAff(read("public/dictionary/en.aff")),
  userModel: UserModel.empty(),
});

const cases = [
  [[], "teh", "the (transposition)"],
  [[], "recieve", "receive"],
  [[], "definately", "definitely (hard map)"],
  [[], "becuse", "because (needs real dict)"],
  [[], "langauge", "language (needs real dict)"],
  [["i", "went"], "hpme", "home (dict + context)"],
  [[], "wprf", "word (two neighbour keys)"],
  [[], "jwtboard", "keyboard (three neighbour keys)"],
  [[], "ekbyaord", "keyboard (three transpositions)"],
  [[], "kkeeyyboard", "keyboard (three bounced keys)"],
  [[], "bokeper", "bookkeeper (three dropped doubles)"],
  [[], "telefone", "telephone (REP f->ph; SymSpell misses it)"],
  [[], "fotographer", "photographer (REP f->ph)"],
  [[], "nite", "night (curated phonetic spelling)"],
  [[], "wprd", "word/work — ambiguous (short)"],
  [[], "woord", "word/wood — ambiguous (short)"],
  [[], "the", "none — valid word"],
  [[], "cat", "none — valid word"],
  [["in"], "teh", "the (context)"],
  [["came"], "form", "suggest from (confusion)"],
  [[], "form", "none — valid, no context"],
  [[], "fooBar", "none — code-like"],
  [[], "https://x.io", "none — url"],
];

function show(decision) {
  if (decision.action === "replace") return `replace → "${decision.replacement}"`;
  if (decision.action === "suggest") {
    return `suggest → [${decision.candidates.slice(0, 3).map((c) => c.term).join(", ")}]`;
  }
  return "none";
}

console.log(`${"context".padEnd(12)}${"typed".padEnd(14)}${"result".padEnd(26)}expected`);
console.log("-".repeat(72));
for (const [prev, word, expected] of cases) {
  const decision = engine.decide(word, { previousWords: prev });
  const ctx = prev.length ? prev.join(" ") : "—";
  console.log(`${ctx.padEnd(12)}${word.padEnd(14)}${show(decision).padEnd(26)}${expected}`);
}
