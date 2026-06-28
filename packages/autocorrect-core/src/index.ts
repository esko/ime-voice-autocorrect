export { createAutocorrectEngine } from "./autocorrectEngine.js";
export type { AutocorrectEngine, CorrectionResult } from "./autocorrectEngine.js";
export type { CorrectionDecision } from "./decision.js";
export type { RankedCandidate } from "./scoring.js";
export { createCoreEnglishDictionary } from "./coreEnglishDictionary.js";
export { createTestDictionary } from "./dictionary.js";
export type { Dictionary, DictionaryEntry } from "./dictionary.js";
export { loadDictionaryFromLines, loadDictionaryFromText } from "./dictionaryLoader.js";
export { extractLastWord, isWordBoundary } from "./tokenizer.js";
export { formatWordList, parseWordList } from "./wordLists.js";

