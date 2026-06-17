export interface BridgeHeartbeatTarget {
  isConnected(): boolean;
  ping(id: string): void;
}

export class BridgeHeartbeat {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly bridge: BridgeHeartbeatTarget,
    private readonly intervalMs = 5_000,
    private readonly createId: () => string = () => `heartbeat-${Date.now()}`,
  ) {}

  start(): void {
    this.stop();
    this.timer = setInterval(() => {
      if (this.bridge.isConnected()) {
        this.bridge.ping(this.createId());
      }
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
