const FINNISH_CHARS = /[åäöÅÄÖ]/;

const TECHNICAL_TOKEN =
  /^(?:https?:\/\/|www\.|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|[A-Za-z]:\\|\/|\w+_\w+|\w+-\w+|[a-z]+[A-Z]\w*|[A-Z0-9_]{2,})$/;

export function shouldIgnoreToken(token: string): boolean {
  if (FINNISH_CHARS.test(token)) {
    return true;
  }

  if (TECHNICAL_TOKEN.test(token)) {
    return true;
  }

  return false;
}
