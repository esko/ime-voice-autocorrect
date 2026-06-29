/**
 * Candidate source mined from a Hunspell `.aff` file's REP rules.
 *
 * REP rules are curated replacement patterns the dictionary author ships for
 * common *spelling* and *phonetic* mistakes — `f`↔`ph`, `gh`↔`f`, `ch`↔`ti`,
 * `tion`↔`sion`, and so on. These are exactly the errors the keyboard-distance
 * model (SymSpell + `keyboardTypoScore`) misses, because the wrong letters are
 * nowhere near the right ones on the keyboard (`fone`→`phone`, `rite`→`right`).
 *
 * This is purely a candidate *generator*: every string it produces still has to
 * be a real word and clear the same confidence/margin gates as any other
 * candidate, so a noisy rule cannot force a bad correction on its own.
 */

interface ParsedRepRule {
  from: string;
  to: string;
  anchorStart: boolean;
  anchorEnd: boolean;
}

export interface RepRules {
  /** Real-word candidates produced by applying replacement rules to `token`. */
  candidates(token: string): string[];
  /** Number of usable rules parsed. */
  readonly size: number;
}

/**
 * Parse the `REP` lines of a Hunspell `.aff` file. The leading `REP <count>`
 * header is skipped, as are multi-word replacements (`_` denotes a space in
 * Hunspell), which this single-token pipeline cannot apply.
 */
export function parseRepRules(affText: string): ParsedRepRule[] {
  const rules: ParsedRepRule[] = [];
  for (const line of affText.split(/\r?\n/)) {
    if (!line.startsWith("REP ")) {
      continue;
    }
    const parts = line.trim().split(/\s+/);
    // "REP <from> <to>"; the header line is "REP <count>" (skip it).
    if (parts.length < 3) {
      continue;
    }
    let from = parts[1]!;
    const to = parts[2]!;
    // Skip multi-word replacements (Hunspell uses "_" for a space).
    if (from.includes("_") || to.includes("_")) {
      continue;
    }
    const anchorStart = from.startsWith("^");
    const anchorEnd = from.endsWith("$");
    if (anchorStart) from = from.slice(1);
    if (anchorEnd) from = from.slice(0, -1);
    if (from.length === 0) {
      continue;
    }
    rules.push({ from, to: to.toLowerCase(), anchorStart, anchorEnd });
  }
  return rules;
}

function applyRule(token: string, rule: ParsedRepRule): string[] {
  const { from, to, anchorStart, anchorEnd } = rule;
  if (anchorStart) {
    return token.startsWith(from) ? [to + token.slice(from.length)] : [];
  }
  if (anchorEnd) {
    return token.endsWith(from)
      ? [token.slice(0, token.length - from.length) + to]
      : [];
  }
  const first = token.indexOf(from);
  if (first === -1) {
    return [];
  }
  // The single-error case (replace the first occurrence) plus the all-occurrence
  // case. Bounded on purpose — no combinatorial expansion of multiple sites.
  const firstReplaced = token.slice(0, first) + to + token.slice(first + from.length);
  const allReplaced = token.split(from).join(to);
  return allReplaced === firstReplaced ? [firstReplaced] : [firstReplaced, allReplaced];
}

export function createRepRules(rules: readonly ParsedRepRule[]): RepRules {
  return {
    size: rules.length,
    candidates(token) {
      const normalized = token.toLowerCase();
      const out = new Set<string>();
      for (const rule of rules) {
        for (const candidate of applyRule(normalized, rule)) {
          if (candidate !== normalized && /^[a-z]+$/.test(candidate)) {
            out.add(candidate);
          }
        }
      }
      return [...out];
    },
  };
}

/** Convenience: parse a `.aff` file and build the candidate source in one step. */
export function createRepRulesFromAff(affText: string): RepRules {
  return createRepRules(parseRepRules(affText));
}
