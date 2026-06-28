// Copies the en_US Hunspell dictionary from the `dictionary-en` package into
// public/ so vite ships it as a packaged resource the service worker fetches.
// Regenerated on each build; the data itself is not committed.

import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(appDir, "node_modules", "dictionary-en");
const outDir = join(appDir, "public", "dictionary");

mkdirSync(outDir, { recursive: true });

for (const [from, to] of [
  ["index.aff", "en.aff"],
  ["index.dic", "en.dic"],
]) {
  const source = join(sourceDir, from);
  if (!existsSync(source)) {
    console.error(`Missing ${source}. Is the "dictionary-en" dev dependency installed?`);
    process.exit(1);
  }
  copyFileSync(source, join(outDir, to));
}

console.log("Copied en_US dictionary to public/dictionary/");
