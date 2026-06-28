// Builds the bundled English n-gram tables:
//   - bigrams  from Norvig's web-corpus counts (full filtered set)
//   - trigrams from a local subs2vec count file if given, else orgtre's cleaned
//     Google-Books top-3000 list (subs2vec is the preferred, subtitle-based
//     source but its host blocks automated downloads, so pass it as a file)
// Run manually to (re)generate — it needs network, so it is NOT part of `build`.
// The outputs (public/ngrams/*.txt) are committed because there is no npm
// dependency to regenerate them from at build time.
//
//   node scripts/build-ngrams.mjs [path/to/subs2vec-en-trigrams.tsv]

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BIGRAM_SOURCE = "https://norvig.com/ngrams/count_2w.txt";
const TRIGRAM_SOURCE =
  "https://raw.githubusercontent.com/orgtre/google-books-ngram-frequency/master/ngrams/3grams_english.csv";
const WORD = /^[a-z]+$/;

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(appDir, "public", "ngrams");

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Failed to fetch ${url}: ${response.status}`);
    process.exit(1);
  }
  return response.text();
}

function wordsOk(parts) {
  return parts.length >= 2 && parts.every((word) => WORD.test(word));
}

mkdirSync(outDir, { recursive: true });

// --- Bigrams: "w1 w2<TAB>count", tab-separated source ---
const bigramText = await fetchText(BIGRAM_SOURCE);
const bigrams = [];
for (const line of bigramText.split("\n")) {
  const tab = line.indexOf("\t");
  if (tab < 0) continue;
  const pair = line.slice(0, tab);
  const count = Number(line.slice(tab + 1));
  if (!Number.isFinite(count)) continue;
  if (!wordsOk(pair.split(" "))) continue;
  bigrams.push([pair, count]);
}
bigrams.sort((a, b) => b[1] - a[1]);
writeFileSync(
  join(outDir, "en-bigrams.txt"),
  bigrams.map(([pair, count]) => `${pair}\t${count}`).join("\n") + "\n",
);
console.log(`Wrote ${bigrams.length} word-pair bigrams`);

// --- Trigrams: subs2vec local file (preferred) or orgtre CSV fallback ---
// Each line yields [ngram, count]; the parser detects the numeric field so it
// works for "ngram,count", "ngram\tcount", or "count\tngram".
function parseNgramLine(line) {
  const parts = line.includes("\t") ? line.split("\t") : [line.slice(0, line.lastIndexOf(",")), line.slice(line.lastIndexOf(",") + 1)];
  const numericIndex = parts.findIndex((p) => p.trim() !== "" && Number.isFinite(Number(p)));
  if (numericIndex < 0) return null;
  const count = Number(parts[numericIndex]);
  const ngram = parts.filter((_, i) => i !== numericIndex).join(" ").trim().toLowerCase();
  return [ngram, count];
}

const subs2vecPath = process.argv[2];
const trigramText = subs2vecPath
  ? readFileSync(subs2vecPath, "utf8")
  : await fetchText(TRIGRAM_SOURCE);
console.log(`Trigram source: ${subs2vecPath ?? TRIGRAM_SOURCE}`);

const trigrams = [];
for (const line of trigramText.split("\n")) {
  const parsed = parseNgramLine(line);
  if (!parsed) continue;
  const [ngram, count] = parsed;
  const words = ngram.split(" ");
  if (words.length !== 3 || !wordsOk(words)) continue;
  trigrams.push([ngram, count]);
}
trigrams.sort((a, b) => b[1] - a[1]);
writeFileSync(
  join(outDir, "en-trigrams.txt"),
  trigrams.map(([ngram, count]) => `${ngram}\t${count}`).join("\n") + "\n",
);
console.log(`Wrote ${trigrams.length} word-triple trigrams`);
