import type { CandidateView } from "./chromeImeUiAdapter.js";

export interface SuggestionUiPort {
  setCandidates(contextId: number, candidates: CandidateView[]): void;
  setCandidateWindowVisible(engineId: string, visible: boolean): void;
}

export interface SuggestionTextPort {
  deleteSurroundingText(contextId: number, length: number): Promise<void>;
  commitText(contextId: number, text: string): Promise<void>;
}

interface PendingSuggestion {
  engineId: string;
  contextId: number;
  original: string;
  delimiter: string;
  candidates: { id: number; term: string }[];
}

const MAX_CANDIDATES = 5;

/**
 * Owns the medium-confidence "show candidates" path. A suggestion is offered for
 * the just-typed token; if the user picks one, the original token (and the
 * delimiter that followed) is replaced with the chosen word. Any further typing
 * or focus change dismisses the pending suggestion.
 */
export class SuggestionController {
  private pending: PendingSuggestion | null = null;

  constructor(
    private readonly ui: SuggestionUiPort,
    private readonly text: SuggestionTextPort,
  ) {}

  offer(
    engineId: string,
    contextId: number,
    original: string,
    delimiter: string,
    candidates: readonly { term: string }[],
  ): void {
    const top = candidates
      .slice(0, MAX_CANDIDATES)
      .map((candidate, index) => ({ id: index, term: candidate.term }));
    if (top.length === 0) {
      return;
    }
    this.pending = { engineId, contextId, original, delimiter, candidates: top };
    this.ui.setCandidates(
      contextId,
      top.map((candidate) => ({
        id: candidate.id,
        candidate: candidate.term,
        label: String(candidate.id + 1),
      })),
    );
    this.ui.setCandidateWindowVisible(engineId, true);
  }

  /** Commit the chosen candidate; returns the applied correction for undo/learning. */
  async select(candidateId: number): Promise<{ original: string; replacement: string } | null> {
    const pending = this.pending;
    if (!pending) {
      return null;
    }
    const chosen = pending.candidates.find((candidate) => candidate.id === candidateId);
    this.dismiss();
    if (!chosen) {
      return null;
    }
    await this.text.deleteSurroundingText(
      pending.contextId,
      pending.original.length + pending.delimiter.length,
    );
    await this.text.commitText(pending.contextId, chosen.term + pending.delimiter);
    return { original: pending.original, replacement: chosen.term };
  }

  dismiss(): void {
    const pending = this.pending;
    if (!pending) {
      return;
    }
    this.pending = null;
    this.ui.setCandidateWindowVisible(pending.engineId, false);
  }

  hasPending(): boolean {
    return this.pending !== null;
  }
}
