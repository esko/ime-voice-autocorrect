const FINNISH_CHARS = /[åäöÅÄÖ]/;

// Tokens that look like code/identifiers, not prose, and must never be
// "corrected". The case-shape rules are deliberately narrow so that *accidental
// shift-key* typos (common with motor difficulty) still get fixed:
//   - camelCase requires 2+ leading lowercase letters, so a real identifier
//     ("fooBar", "getValue") is protected while a slip like "tEh" is not.
//   - SCREAMING_CASE constants are caught by the underscore rule; a bare all-caps
//     word ("TEH", "THE") is left correctable (real acronyms are protected by the
//     validator and the all-caps scoring penalty instead).
const TECHNICAL_TOKEN =
  /^(?:https?:\/\/|www\.|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|[A-Za-z]:\\|\/|\w+_\w+|\w+-\w+|[a-z]{2,}[A-Z]\w*|[A-Za-z]*[0-9]\w*)$/;

export function shouldIgnoreToken(token: string): boolean {
  if (FINNISH_CHARS.test(token)) {
    return true;
  }

  if (TECHNICAL_TOKEN.test(token)) {
    return true;
  }

  return false;
}
