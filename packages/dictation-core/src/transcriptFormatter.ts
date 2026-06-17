import type { DictationConfig } from "./config.js";

const SPOKEN_PUNCTUATION: Array<{ pattern: RegExp; symbol: string; attachLeft: boolean }> = [
  { pattern: /\bcomma\b/gi, symbol: ",", attachLeft: true },
  { pattern: /\b(?:period|full stop)\b/gi, symbol: ".", attachLeft: true },
  { pattern: /\bnew line\b/gi, symbol: "\n", attachLeft: true },
];

export function detectScratchThat(raw: string): boolean {
  return /^\s*(?:scratch that|undo)\s*$/i.test(raw.trim());
}

function applySpokenPunctuation(text: string): string {
  let result = text;
  for (const rule of SPOKEN_PUNCTUATION) {
    result = result.replace(
      new RegExp(`\\s*${rule.pattern.source}`, "gi"),
      rule.attachLeft ? `${rule.symbol} ` : rule.symbol,
    );
  }
  return result.replace(/ {2,}/g, " ").trim();
}

export function formatFinalTranscript(raw: string, config: DictationConfig): string {
  let text = raw.trim();
  if (config.spokenPunctuation) {
    text = applySpokenPunctuation(text);
  }
  if (config.appendSpace && text && !/[\s]$/.test(text)) {
    text += " ";
  }
  return text;
}

export function formatPartialTranscript(raw: string, config: DictationConfig): string {
  const text = raw.trim();
  if (!config.spokenPunctuation) {
    return text;
  }
  return applySpokenPunctuation(text);
}
