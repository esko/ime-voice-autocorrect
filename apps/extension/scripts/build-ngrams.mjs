// Builds the bundled English bigram table from Norvig's web-corpus bigrams.
// Run manually to (re)generate — it needs network, so it is NOT part of `build`.
// The output (public/ngrams/en-bigrams.txt) is committed because there is no npm
// dependency to regenerate it from at build time.
//
//   node scripts/build-ngrams.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = "https://norvig.com/ngrams/count_2w.txt";
const WORD = /^[a-z]+$/;

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(appDir, "public", "ngrams", "en-bigrams.txt");

const response = await fetch(SOURCE);
if (!response.ok) {
  console.error(`Failed to fetch ${SOURCE}: ${response.status}`);
  process.exit(1);
}
const text = await response.text();

const rows = [];
for (const line of text.split("\n")) {
  const tab = line.indexOf("\t");
  if (tab < 0) continue;
  const pair = line.slice(0, tab);
  const count = Number(line.slice(tab + 1));
  if (!Number.isFinite(count)) continue;
  const space = pair.indexOf(" ");
  if (space < 0) continue;
  // Keep only plain lowercase word pairs (drops numbers, proper nouns, junk).
  if (!WORD.test(pair.slice(0, space)) || !WORD.test(pair.slice(space + 1))) continue;
  rows.push([pair, count]);
}

rows.sort((a, b) => b[1] - a[1]);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, rows.map(([pair, count]) => `${pair}\t${count}`).join("\n") + "\n");
console.log(`Wrote ${rows.length} word-pair bigrams to ${outPath}`);
