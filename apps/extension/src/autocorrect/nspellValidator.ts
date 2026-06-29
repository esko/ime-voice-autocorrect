import nspell from "nspell";
import { createRepRulesFromAff, type RepRules, type Validator } from "@input-assist/autocorrect-core";

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
 * build a validator plus the REP-rule candidate source mined from the same
 * `.aff` (so the file is fetched once). The service worker fetches its own
 * packaged resources.
 */
export async function loadEnglishValidator(
  getUrl: (path: string) => string,
  fetchText: (url: string) => Promise<string> = async (url) => (await fetch(url)).text(),
): Promise<{ validator: Validator; repRules: RepRules }> {
  const [aff, dic] = await Promise.all([
    fetchText(getUrl("dictionary/en.aff")),
    fetchText(getUrl("dictionary/en.dic")),
  ]);
  return { validator: createNspellValidator(aff, dic), repRules: createRepRulesFromAff(aff) };
}
