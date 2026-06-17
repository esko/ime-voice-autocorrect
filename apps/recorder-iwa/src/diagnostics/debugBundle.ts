export function redactSecrets(value: string): string {
  return value
    .replace(/sk_[A-Za-z0-9]+/g, "[REDACTED_API_KEY]")
    .replace(/token=[^&\s]+/g, "token=[REDACTED]");
}

export function buildDebugBundle(state: Record<string, unknown>): string {
  const raw = JSON.stringify(state, null, 2);
  return redactSecrets(raw);
}
