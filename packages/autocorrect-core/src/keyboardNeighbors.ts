const NEIGHBORS: Record<string, readonly string[]> = {
  q: ["w", "a"],
  w: ["q", "e", "s", "a"],
  e: ["w", "r", "d", "s"],
  r: ["e", "t", "f", "d"],
  t: ["r", "y", "g", "f"],
  y: ["t", "u", "h", "g"],
  u: ["y", "i", "j", "h"],
  i: ["u", "o", "k", "j"],
  o: ["i", "p", "l", "k"],
  p: ["o", "l"],
  a: ["q", "w", "s", "z"],
  s: ["a", "w", "e", "d", "x", "z"],
  d: ["s", "e", "r", "f", "c", "x"],
  f: ["d", "r", "t", "g", "v", "c"],
  g: ["f", "t", "y", "h", "b", "v"],
  h: ["g", "y", "u", "j", "n", "b"],
  j: ["h", "u", "i", "k", "m", "n"],
  k: ["j", "i", "o", "l", "m"],
  l: ["k", "o", "p"],
  z: ["a", "s", "x"],
  x: ["z", "s", "d", "c"],
  c: ["x", "d", "f", "v"],
  v: ["c", "f", "g", "b"],
  b: ["v", "g", "h", "n"],
  n: ["b", "h", "j", "m"],
  m: ["n", "j", "k"],
};

/** True when `b` is physically adjacent to `a` on a QWERTY keyboard. */
export function areKeyboardNeighbors(a: string, b: string): boolean {
  return NEIGHBORS[a.toLowerCase()]?.includes(b.toLowerCase()) ?? false;
}

/** QWERTY keys physically adjacent to `key`. */
export function keyboardNeighbors(key: string): readonly string[] {
  return NEIGHBORS[key.toLowerCase()] ?? [];
}

export function keyboardNeighborScore(token: string, candidate: string): number {
  if (token.length !== candidate.length) {
    return 0;
  }

  let score = 0;
  for (let index = 0; index < token.length; index++) {
    const from = token[index]?.toLowerCase();
    const to = candidate[index]?.toLowerCase();
    if (!from || !to || from === to) {
      continue;
    }
    if (NEIGHBORS[from]?.includes(to)) {
      score += 1;
    }
  }

  return score;
}
