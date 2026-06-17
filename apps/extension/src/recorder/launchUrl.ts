export function buildRecorderLaunchUrl(baseOrigin: string, extensionId: string): string {
  const normalized = baseOrigin.endsWith("/") ? baseOrigin : `${baseOrigin}/`;
  const url = new URL("recorder", normalized);
  url.searchParams.set("extensionId", extensionId);
  return url.toString();
}
