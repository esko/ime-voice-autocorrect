import nspell from "nspell";
import type { Validator } from "@input-assist/autocorrect-core";

/** Wrap an nspell (Hunspell) dictionary as the engine's Validator. */
export function createNspellValidator(aff: string, dic: string): Validator {
  const speller = nspell(aff, dic);
  return {
    isValid: (word) => speller.correct(word),
    suggest: (word) => speller.suggest(word),
  };
}

/**
 * Load the bundled en_US Hunspell dictionary (shipped as packaged files) and
 * build a validator. The service worker fetches its own packaged resources.
 */
export async function loadEnglishValidator(
  getUrl: (path: string) => string,
  fetchText: (url: string) => Promise<string> = async (url) => (await fetch(url)).text(),
): Promise<Validator> {
  const [aff, dic] = await Promise.all([
    fetchText(getUrl("dictionary/en.aff")),
    fetchText(getUrl("dictionary/en.dic")),
  ]);
  return createNspellValidator(aff, dic);
}
