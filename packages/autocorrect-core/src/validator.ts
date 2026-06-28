/**
 * A spell-validity oracle (e.g. a Hunspell/nspell dictionary). The engine stays
 * Chrome- and dependency-agnostic; the host supplies a concrete validator.
 *
 * SymSpell generates candidates and a frequency list ranks them; the validator
 * answers "is this a real word?" — used to protect valid originals from being
 * "corrected" and to drop candidates that are not real words.
 */
export interface Validator {
  isValid(word: string): boolean;
  /** Optional fallback suggestions when candidate generation is thin. */
  suggest?(word: string): string[];
}
