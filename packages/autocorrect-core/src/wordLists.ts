export function parseWordList(text: string): string[] {
  return [...new Set(text.split(/[\n,]+/).map((word) => word.trim().toLowerCase()).filter(Boolean))];
}

export function formatWordList(words: readonly string[]): string {
  return words.join("\n");
}
