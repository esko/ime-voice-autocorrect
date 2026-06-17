import { describe, expect, it, vi } from "vitest";
import { BridgeHeartbeat } from "./heartbeat.js";

describe("BridgeHeartbeat", () => {
  it("pings the recorder while connected", () => {
    vi.useFakeTimers();
    const ping = vi.fn();
    const heartbeat = new BridgeHeartbeat(
      {
        isConnected: () => true,
        ping,
      },
      1_000,
      () => "heartbeat-1",
    );

    heartbeat.start();
    vi.advanceTimersByTime(1_000);
    expect(ping).toHaveBeenCalledWith("heartbeat-1");

    heartbeat.stop();
    vi.useRealTimers();
  });
});
