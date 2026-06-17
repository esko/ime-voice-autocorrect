export interface RecorderLauncher {
  launch(): Promise<void>;
}

export class PendingRecorderLauncher implements RecorderLauncher {
  private launched = false;

  constructor(private readonly onLaunch: () => Promise<void>) {}

  async launch(): Promise<void> {
    if (this.launched) {
      return;
    }
    this.launched = true;
    await this.onLaunch();
  }

  wasLaunched(): boolean {
    return this.launched;
  }
}
