import type { Dictionary, DictionaryEntry } from "./dictionary.js";

export function parseDictionaryLine(line: string): DictionaryEntry | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const [word, frequencyText] = trimmed.split(/\s+/);
  if (!word || !/^[a-z]+$/i.test(word)) {
    return null;
  }

  const frequency = frequencyText ? Number.parseInt(frequencyText, 10) : 1;
  if (!Number.isFinite(frequency) || frequency < 1) {
    return null;
  }

  return { word: word.toLowerCase(), frequency };
}

export function loadDictionaryFromText(text: string, maxEditDistance = 2): Dictionary {
  const entries = text
    .split(/\r?\n/)
    .map(parseDictionaryLine)
    .filter((entry): entry is DictionaryEntry => entry !== null);

  return { entries, maxEditDistance };
}

export function loadDictionaryFromLines(
  lines: readonly string[],
  maxEditDistance = 2,
): Dictionary {
  return loadDictionaryFromText(lines.join("\n"), maxEditDistance);
}
