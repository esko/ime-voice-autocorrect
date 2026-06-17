import { describe, expect, it, vi } from "vitest";
import { buildSettingsPageUrl, openSettingsPage } from "./settingsUrl.js";

describe("settingsUrl", () => {
  it("builds a settings page url with extension id", () => {
    expect(buildSettingsPageUrl("ext-123", "isolated-app://abc")).toBe(
      "isolated-app://abc/settings.html?extensionId=ext-123",
    );
  });

  it("opens the settings page through the provided navigation function", () => {
    const open = vi.fn();
    openSettingsPage("ext-123", open, "isolated-app://abc");
    expect(open).toHaveBeenCalledWith("isolated-app://abc/settings.html?extensionId=ext-123");
  });
});
