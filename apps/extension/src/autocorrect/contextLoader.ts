import { createNgramContext, type ContextModel } from "@input-assist/autocorrect-core";

/** Parse the bundled "w1 w2\tcount" bigram table into a frequency record. */
export function parseBigramTable(text: string): Record<string, number> {
  const bigrams: Record<string, number> = {};
  for (const line of text.split("\n")) {
    const tab = line.indexOf("\t");
    if (tab < 0) {
      continue;
    }
    const key = line.slice(0, tab);
    const count = Number(line.slice(tab + 1));
    if (key && Number.isFinite(count)) {
      bigrams[key] = count;
    }
  }
  return bigrams;
}

/**
 * Load the bundled English bigram corpus (a packaged file the service worker
 * fetches) and build a context model from it.
 */
export async function loadEnglishContext(
  getUrl: (path: string) => string,
  fetchText: (url: string) => Promise<string> = async (url) => (await fetch(url)).text(),
): Promise<ContextModel> {
  const text = await fetchText(getUrl("ngrams/en-bigrams.txt"));
  return createNgramContext({ bigrams: parseBigramTable(text) });
}
