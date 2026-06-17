const WORD_BOUNDARY = /[\s.,!?;:'")\]}>]/;

export function isWordBoundary(character: string): boolean {
  return WORD_BOUNDARY.test(character);
}

export function extractLastWord(textBeforeBoundary: string): string | null {
  const match = /(?:^|[\s.,!?;:'"(\[{<])([A-Za-z']+)$/.exec(textBeforeBoundary);
  return match?.[1] ?? null;
}
