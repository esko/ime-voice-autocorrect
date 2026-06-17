import { describe, expect, it, vi } from "vitest";
import { createChromeImeAdapter } from "./chromeImeAdapter.js";

describe("createChromeImeAdapter", () => {
  it("commits text through chrome.input.ime for the active context", async () => {
    const commitText = vi.fn((_parameters, callback) => callback?.(true));
    const adapter = createChromeImeAdapter(
      { input: { ime: { commitText, deleteSurroundingText: vi.fn() } } } as never,
      () => ({ contextID: 7, type: "text" }) as chrome.input.ime.InputContext,
      () => "input-assist-us",
    );

    await expect(adapter.commitText("hello")).resolves.toBe(true);
    expect(commitText).toHaveBeenCalledWith({ contextID: 7, text: "hello" }, expect.any(Function));
  });
});
