const UNSAFE_CONTEXT_TYPES = new Set(["password", "email", "number", "tel"]);

export function isUnsafeField(contextType: string | undefined): boolean {
  if (!contextType) {
    return false;
  }
  return UNSAFE_CONTEXT_TYPES.has(contextType.toLowerCase());
}

export function isDictationAllowed(contextType: string | undefined): boolean {
  return !isUnsafeField(contextType);
}
