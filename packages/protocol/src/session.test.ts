import { describe, expect, it } from "vitest";
import {
  isSessionIdMatch,
  isSessionScopedRecorderMessage,
  isSessionScopedExtensionMessage,
} from "./session.js";

describe("session id guards", () => {
  it("detects session-scoped recorder messages", () => {
    expect(
      isSessionScopedRecorderMessage({
        type: "COMMITTED_TRANSCRIPT",
        sessionId: "a",
        text: "hi",
      }),
    ).toBe(true);
    expect(isSessionScopedRecorderMessage({ type: "PONG", id: "1" })).toBe(false);
  });

  it("detects session-scoped extension messages", () => {
    expect(
      isSessionScopedExtensionMessage({ type: "STOP_SESSION", sessionId: "a" }),
    ).toBe(true);
    expect(isSessionScopedExtensionMessage({ type: "PING", id: "1" })).toBe(false);
  });

  it("matches session ids for active session", () => {
    expect(
      isSessionIdMatch(
        { type: "COMMITTED_TRANSCRIPT", sessionId: "sess-1", text: "hi" },
        "sess-1",
      ),
    ).toBe(true);
  });

  it("rejects mismatched session ids", () => {
    expect(
      isSessionIdMatch(
        { type: "PARTIAL_TRANSCRIPT", sessionId: "old", text: "hi" },
        "new",
      ),
    ).toBe(false);
  });
});
