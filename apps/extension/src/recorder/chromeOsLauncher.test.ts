import { describe, expect, it, vi } from "vitest";
import { createChromeOsRecorderLauncher } from "./chromeOsLauncher.js";

describe("createChromeOsRecorderLauncher", () => {
  it("opens the recorder iwa when base origin is configured", async () => {
    const create = vi.fn(async () => ({}));
    const launcher = createChromeOsRecorderLauncher({
      extensionId: "ext-1",
      tabs: { create },
      storage: {
        get: async () => ({ recorderBaseOrigin: "isolated-app://abc" }),
      },
    });

    await launcher.launch();

    expect(create).toHaveBeenCalledWith({
      url: "isolated-app://abc/recorder?extensionId=ext-1",
      active: false,
    });
  });

  it("no-ops when recorder base origin is not configured", async () => {
    const create = vi.fn(async () => ({}));
    const launcher = createChromeOsRecorderLauncher({
      extensionId: "ext-1",
      tabs: { create },
      storage: { get: async () => ({}) },
    });

    await launcher.launch();

    expect(create).not.toHaveBeenCalled();
  });
});
