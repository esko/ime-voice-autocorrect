import { describe, expect, it } from "vitest";
import { decodeRealtimeMessage, reconnectDelay } from "./realtimeProtocol.js";

describe("decodeRealtimeMessage", () => {
  it("classifies session, partial, committed, and error frames", () => {
    expect(decodeRealtimeMessage(JSON.stringify({ message_type: "session_started" }))).toEqual({
      type: "sessionStarted",
    });
    expect(
      decodeRealtimeMessage(
        JSON.stringify({ message_type: "partial_transcript", text: "hello" }),
      ),
    ).toEqual({ type: "partial", text: "hello" });
    expect(
      decodeRealtimeMessage(
        JSON.stringify({ message_type: "committed_transcript", text: "hello world" }),
      ),
    ).toEqual({ type: "committed", text: "hello world" });
    expect(decodeRealtimeMessage(JSON.stringify({ message_type: "error", error: "boom" }))).toEqual({
      type: "error",
      detail: "boom",
    });
  });

  it("ignores malformed json and empty partials", () => {
    expect(decodeRealtimeMessage("{")).toEqual({ type: "ignored" });
    expect(
      decodeRealtimeMessage(JSON.stringify({ message_type: "partial_transcript", text: "" })),
    ).toEqual({ type: "ignored" });
  });
});

describe("reconnectDelay", () => {
  it("returns bounded backoff delays", () => {
    expect(reconnectDelay(0)).toBe(400);
    expect(reconnectDelay(2)).toBe(2000);
    expect(reconnectDelay(5)).toBeNull();
  });
});
