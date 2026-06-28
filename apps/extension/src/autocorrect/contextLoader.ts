import { createNgramContext, type ContextModel } from "@input-assist/autocorrect-core";

/** Parse a "ngram\tcount" table (bigram or trigram) into a frequency record. */
export function parseNgramTable(text: string): Record<string, number> {
  const ngrams: Record<string, number> = {};
  for (const line of text.split("\n")) {
    const tab = line.indexOf("\t");
    if (tab < 0) {
      continue;
    }
    const key = line.slice(0, tab);
    const count = Number(line.slice(tab + 1));
    if (key && Number.isFinite(count)) {
      ngrams[key] = count;
    }
  }
  return ngrams;
}

/**
 * Load the bundled English bigram + trigram corpora (packaged files the service
 * worker fetches) and build a context model. The trigram table is optional —
 * the model backs off to bigrams.
 */
export async function loadEnglishContext(
  getUrl: (path: string) => string,
  fetchText: (url: string) => Promise<string> = async (url) => (await fetch(url)).text(),
): Promise<ContextModel> {
  const bigramText = await fetchText(getUrl("ngrams/en-bigrams.txt"));
  const trigramText = await fetchText(getUrl("ngrams/en-trigrams.txt")).catch(() => "");
  return createNgramContext({
    bigrams: parseNgramTable(bigramText),
    trigrams: parseNgramTable(trigramText),
  });
}
