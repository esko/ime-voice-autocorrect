import { describe, expect, it, vi } from "vitest";
import { AutocorrectImeAdapter } from "./adapter.js";

describe("AutocorrectImeAdapter", () => {
  it("replaces teh with the at a word boundary", async () => {
    const deletes: number[] = [];
    const commits: string[] = [];
    const adapter = new AutocorrectImeAdapter({
      deleteSurroundingText: async (_contextId, length) => {
        deletes.push(length);
      },
      commitText: async (_contextId, text) => {
        commits.push(text);
      },
    });

    await adapter.onCharacterTyped(1, "say teh", " ");

    expect(deletes).toEqual([3]);
    expect(commits).toEqual(["the"]);
  });

  it("restores the original token on immediate backspace", async () => {
    const adapter = new AutocorrectImeAdapter({
      deleteSurroundingText: vi.fn(),
      commitText: vi.fn(),
    });

    await adapter.onCharacterTyped(1, "teh", " ");
    const restored = await adapter.onBackspace(1);

    expect(restored).toBe(true);
  });
});
