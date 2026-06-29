import { describe, expect, it, vi } from "vitest";
import { AutocorrectImeAdapter } from "./adapter.js";

describe("AutocorrectImeAdapter", () => {
  it("evaluates teh -> the and commits the replacement plus the delimiter", async () => {
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

    const evaluation = adapter.evaluate("say teh", " ");
    expect(evaluation?.token).toBe("teh");
    expect(evaluation?.decision.action).toBe("replace");
    if (evaluation?.decision.action === "replace") {
      await adapter.commitReplacement(1, evaluation.token, evaluation.decision.replacement, " ");
    }

    expect(deletes).toEqual([3]);
    // The trailing space is re-emitted with the word so it is never swallowed.
    expect(commits).toEqual(["the "]);
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

  it("evaluates to null when disabled", () => {
    const adapter = new AutocorrectImeAdapter(
      {
        deleteSurroundingText: async () => {},
        commitText: async () => {},
      },
      { enabled: false },
    );

    expect(adapter.evaluate("teh", " ")).toBeNull();
  });

  it("honors personal dictionary entries from settings updates", () => {
    const adapter = new AutocorrectImeAdapter({
      deleteSurroundingText: async () => {},
      commitText: async () => {},
    });

    adapter.updateWordLists({ personalDictionary: ["teh"] });
    // "teh" is now a kept word, so it is never corrected.
    expect(adapter.evaluate("say teh", " ")?.decision.action).toBe("none");
  });
});
