import { describe, expect, it, vi } from "vitest";
import { createChromeOsRecorderLauncher } from "./chromeOsLauncher.js";

describe("createChromeOsRecorderLauncher", () => {
  it("sends launch message to recorder extension", async () => {
    const sendMessage = vi.fn(async () => ({}));
    const launcher = createChromeOsRecorderLauncher({
      recorderExtensionId: "recorder-ext-id",
      runtime: { sendMessage },
    });

    await launcher.launch();

    expect(sendMessage).toHaveBeenCalledWith("recorder-ext-id", {
      type: "LAUNCH_RECORDER",
    });
  });
});
