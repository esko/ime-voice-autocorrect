/**
 * Standard Damerau-Levenshtein distance. The matrix is stored as a single flat
 * array indexed `row * width + col`, which avoids per-row allocations and the
 * type-unsafe nested indexing.
 */
export function damerauLevenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const height = a.length + 1;
  const width = b.length + 1;
  const matrix = new Uint32Array(height * width);
  const at = (i: number, j: number): number => matrix[i * width + j]!;
  const set = (i: number, j: number, value: number): void => {
    matrix[i * width + j] = value;
  };

  for (let i = 0; i <= a.length; i++) set(i, 0, i);
  for (let j = 0; j <= b.length; j++) set(0, j, j);

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let minCost = Math.min(
        at(i - 1, j) + 1, // deletion
        at(i, j - 1) + 1, // insertion
        at(i - 1, j - 1) + cost, // substitution
      );

      // Transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        minCost = Math.min(minCost, at(i - 2, j - 2) + cost);
      }

      set(i, j, minCost);
    }
  }

  return at(a.length, b.length);
}
