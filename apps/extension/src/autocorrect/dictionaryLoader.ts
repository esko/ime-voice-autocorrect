import { loadDictionaryFromText, type Dictionary } from "@input-assist/autocorrect-core";

/**
 * Load the bundled English frequency dictionary (a packaged file the service
 * worker fetches) — a Hunspell-filtered Norvig unigram list. This replaces the
 * tiny built-in core dictionary so candidate generation and frequency ranking
 * work across real vocabulary.
 */
export async function loadEnglishDictionary(
  getUrl: (path: string) => string,
  fetchText: (url: string) => Promise<string> = async (url) => (await fetch(url)).text(),
): Promise<Dictionary> {
  const text = await fetchText(getUrl("ngrams/en-freq.txt"));
  return loadDictionaryFromText(text, 2);
}
