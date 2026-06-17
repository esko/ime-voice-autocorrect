import { CORE_ENGLISH_TEXT } from "./data/coreEnglish.js";
import type { Dictionary } from "./dictionary.js";
import { loadDictionaryFromText } from "./dictionaryLoader.js";

export function createCoreEnglishDictionary(): Dictionary {
  return loadDictionaryFromText(CORE_ENGLISH_TEXT);
}
