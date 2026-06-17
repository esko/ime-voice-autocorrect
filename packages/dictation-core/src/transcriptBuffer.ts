export class TranscriptBuffer {
  private segments: string[] = [];

  reset(): void {
    this.segments = [];
  }

  append(segment: string): void {
    const trimmed = segment.trim();
    if (trimmed) {
      this.segments.push(trimmed);
    }
  }

  scratchThat(): void {
    this.segments.pop();
  }

  toText(): string {
    return this.segments.join(" ");
  }
}
