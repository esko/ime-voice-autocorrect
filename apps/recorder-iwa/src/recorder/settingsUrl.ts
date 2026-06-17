export function buildSettingsPageUrl(extensionId: string, origin = globalThis.location?.origin ?? ""): string {
  const url = new URL("settings.html", `${origin}/`);
  url.searchParams.set("extensionId", extensionId);
  return url.toString();
}

export function openSettingsPage(
  extensionId: string,
  open: (url: string) => void = (url) => {
    globalThis.location.href = url;
  },
  origin = globalThis.location?.origin ?? "http://localhost",
): void {
  open(buildSettingsPageUrl(extensionId, origin));
}
