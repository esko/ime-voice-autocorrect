import { describe, expect, it } from "vitest";
import { buildRecorderLaunchUrl } from "./launchUrl.js";

describe("buildRecorderLaunchUrl", () => {
  it("appends extension id query param to the recorder path", () => {
    expect(buildRecorderLaunchUrl("isolated-app://abc", "ext-1")).toBe(
      "isolated-app://abc/recorder?extensionId=ext-1",
    );
  });
});
