/**
 * What the engine has learned from the user's behaviour. Stored by the host
 * (chrome.storage.local) and fed back into scoring. All counts are local.
 */
export interface UserLearningData {
  /** "original→replacement" -> times the user kept this correction. */
  acceptedCorrections: Record<string, number>;
  /** "original→replacement" -> times the user undid this correction. */
  rejectedCorrections: Record<string, number>;
  /** word -> times the user kept/added it (treated as valid, never corrected). */
  acceptedWords: Record<string, number>;
}

export function emptyLearningData(): UserLearningData {
  return { acceptedCorrections: {}, rejectedCorrections: {}, acceptedWords: {} };
}

function pairKey(original: string, replacement: string): string {
  return `${original.toLowerCase()}→${replacement.toLowerCase()}`;
}

/** Mutable per-user model. The engine holds a reference for live scoring. */
export class UserModel {
  private constructor(private readonly data: UserLearningData) {}

  static empty(): UserModel {
    return new UserModel(emptyLearningData());
  }

  static fromSnapshot(data: Partial<UserLearningData>): UserModel {
    return new UserModel({
      acceptedCorrections: { ...data.acceptedCorrections },
      rejectedCorrections: { ...data.rejectedCorrections },
      acceptedWords: { ...data.acceptedWords },
    });
  }

  /** Positive for repeatedly accepted pairs, negative for rejected ones. */
  score(original: string, candidate: string): number {
    const key = pairKey(original, candidate);
    const accepted = this.data.acceptedCorrections[key] ?? 0;
    const rejected = this.data.rejectedCorrections[key] ?? 0;
    return 0.8 * Math.log1p(accepted) - 1.5 * Math.log1p(rejected);
  }

  /** A pair the user has undone at least once must never be auto-applied again. */
  wasRejected(original: string, candidate: string): boolean {
    return (this.data.rejectedCorrections[pairKey(original, candidate)] ?? 0) > 0;
  }

  /** A pair the user has accepted at least once (gates real-word auto-swaps). */
  wasAccepted(original: string, candidate: string): boolean {
    return (this.data.acceptedCorrections[pairKey(original, candidate)] ?? 0) > 0;
  }

  isAcceptedWord(word: string): boolean {
    return (this.data.acceptedWords[word.toLowerCase()] ?? 0) > 0;
  }

  recordAccepted(original: string, replacement: string): void {
    const key = pairKey(original, replacement);
    this.data.acceptedCorrections[key] = (this.data.acceptedCorrections[key] ?? 0) + 1;
  }

  recordRejected(original: string, replacement: string): void {
    const key = pairKey(original, replacement);
    this.data.rejectedCorrections[key] = (this.data.rejectedCorrections[key] ?? 0) + 1;
  }

  recordAcceptedWord(word: string): void {
    const key = word.toLowerCase();
    this.data.acceptedWords[key] = (this.data.acceptedWords[key] ?? 0) + 1;
  }

  /** Merge persisted counts into this live instance (e.g. async load on start). */
  hydrate(data: Partial<UserLearningData>): void {
    Object.assign(this.data.acceptedCorrections, data.acceptedCorrections);
    Object.assign(this.data.rejectedCorrections, data.rejectedCorrections);
    Object.assign(this.data.acceptedWords, data.acceptedWords);
  }

  /**
   * Replace all learned data (unlike hydrate, this *removes* entries no longer
   * present). Used when the user edits their learned corrections in the options
   * page and the live engine must reflect deletions immediately.
   */
  replace(data: Partial<UserLearningData>): void {
    this.data.acceptedCorrections = { ...data.acceptedCorrections };
    this.data.rejectedCorrections = { ...data.rejectedCorrections };
    this.data.acceptedWords = { ...data.acceptedWords };
  }

  snapshot(): UserLearningData {
    return {
      acceptedCorrections: { ...this.data.acceptedCorrections },
      rejectedCorrections: { ...this.data.rejectedCorrections },
      acceptedWords: { ...this.data.acceptedWords },
    };
  }
}
