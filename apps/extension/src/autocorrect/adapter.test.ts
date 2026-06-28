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

  it("restores the original token on undoCorrection", async () => {
    let deletedLength = 0;
    const adapter = new AutocorrectImeAdapter({
      deleteSurroundingText: async (_ctx, length) => { deletedLength = length; },
      commitText: vi.fn(),
    });

    await adapter.undoCorrection(1, { restore: "teh", deleteLength: 3 });

    expect(deletedLength).toBe(3);
  });

  it("skips corrections when disabled", async () => {
    const commits: string[] = [];
    const adapter = new AutocorrectImeAdapter(
      {
        deleteSurroundingText: async () => {},
        commitText: async (_contextId, text) => {
          commits.push(text);
        },
      },
      { enabled: false },
    );

    await adapter.onCharacterTyped(1, "teh", " ");
    expect(commits).toEqual([]);
  });

  it("honors personal dictionary entries from settings updates", async () => {
    const commits: string[] = [];
    const adapter = new AutocorrectImeAdapter({
      deleteSurroundingText: async () => {},
      commitText: async (_contextId, text) => {
        commits.push(text);
      },
    });

    adapter.updateWordLists({ personalDictionary: ["teh"] });
    await adapter.onCharacterTyped(1, "say teh", " ");

    expect(commits).toEqual([]);
  });
});
