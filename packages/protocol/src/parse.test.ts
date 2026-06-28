import { describe, expect, it } from "vitest";
import {
  parseExtensionToRecorder,
  parseRecorderToExtension,
  ProtocolParseError,
} from "./parse.js";

describe("parseRecorderToExtension", () => {
  it("parses HELLO", () => {
    const message = parseRecorderToExtension({
      type: "HELLO",
      protocolVersion: 1,
      appId: "input-assist-recorder",
    });

    expect(message).toEqual({
      type: "HELLO",
      protocolVersion: 1,
      appId: "input-assist-recorder",
    });
  });

  it("parses RECORDER_READY", () => {
    const message = parseRecorderToExtension({
      type: "RECORDER_READY",
      capabilities: { asrProvider: "elevenlabs-realtime" },
    });

    expect(message.type).toBe("RECORDER_READY");
  });

  it("parses SESSION_STARTED", () => {
    const message = parseRecorderToExtension({
      type: "SESSION_STARTED",
      sessionId: "sess-1",
    });

    expect(message).toMatchObject({ type: "SESSION_STARTED", sessionId: "sess-1" });
  });

  it("parses PARTIAL_TRANSCRIPT with optional stable flag", () => {
    const message = parseRecorderToExtension({
      type: "PARTIAL_TRANSCRIPT",
      sessionId: "sess-1",
      text: "hello",
      stable: true,
    });

    expect(message).toEqual({
      type: "PARTIAL_TRANSCRIPT",
      sessionId: "sess-1",
      text: "hello",
      stable: true,
    });
  });

  it("parses COMMITTED_TRANSCRIPT", () => {
    const message = parseRecorderToExtension({
      type: "COMMITTED_TRANSCRIPT",
      sessionId: "sess-1",
      text: "hello world",
    });
    expect(message).toEqual({
      type: "COMMITTED_TRANSCRIPT",
      sessionId: "sess-1",
      text: "hello world",
    });
  });


  it("parses AUDIO_LEVEL", () => {
    const message = parseRecorderToExtension({
      type: "AUDIO_LEVEL",
      sessionId: "sess-1",
      rms: 0.42,
    });

    expect(message).toMatchObject({ rms: 0.42 });
  });

  it("parses SESSION_ERROR", () => {
    const message = parseRecorderToExtension({
      type: "SESSION_ERROR",
      sessionId: "sess-1",
      message: "network down",
      recoverable: true,
    });

    expect(message.type).toBe("SESSION_ERROR");
  });

  it("parses SESSION_CLOSED for each reason", () => {
    for (const reason of ["stopped", "cancelled", "error"] as const) {
      const message = parseRecorderToExtension({
        type: "SESSION_CLOSED",
        sessionId: "sess-1",
        reason,
      });
      expect(message).toMatchObject({ reason });
    }
  });

  it("parses SETTINGS_SNAPSHOT", () => {
    const message = parseRecorderToExtension({
      type: "SETTINGS_SNAPSHOT",
      settings: { activationMode: "push-to-talk" },
    });

    expect(message.type).toBe("SETTINGS_SNAPSHOT");
  });

  it("parses PONG", () => {
    const message = parseRecorderToExtension({
      type: "PONG",
      id: "ping-1",
    });

    expect(message).toEqual({ type: "PONG", id: "ping-1" });
  });

  it("rejects unknown protocol version on HELLO", () => {
    expect(() =>
      parseRecorderToExtension({
        type: "HELLO",
        protocolVersion: 2,
        appId: "input-assist-recorder",
      }),
    ).toThrow(ProtocolParseError);
  });

  it("rejects session messages with missing session id", () => {
    expect(() =>
      parseRecorderToExtension({
        type: "COMMITTED_TRANSCRIPT",
        sessionId: "",
        text: "hello",
      }),
    ).toThrow(ProtocolParseError);
  });

  it("rejects unknown message types", () => {
    expect(() => parseRecorderToExtension({ type: "NOPE" })).toThrow(ProtocolParseError);
  });
});

describe("parseExtensionToRecorder", () => {
  it("parses HELLO_ACK", () => {
    const message = parseExtensionToRecorder({
      type: "HELLO_ACK",
      protocolVersion: 1,
      extensionState: { recorderConnected: true },
    });

    expect(message.type).toBe("HELLO_ACK");
  });

  it("parses START_SESSION", () => {
    const message = parseExtensionToRecorder({
      type: "START_SESSION",
      sessionId: "sess-1",
      config: {
        activationMode: "push-to-talk",
        languageHint: "auto",
        spokenPunctuation: true,
        appendSpace: false,
      },
    });

    expect(message.type).toBe("START_SESSION");
  });

  it("parses STOP_SESSION and CANCEL_SESSION", () => {
    expect(
      parseExtensionToRecorder({ type: "STOP_SESSION", sessionId: "sess-1" }).type,
    ).toBe("STOP_SESSION");
    expect(
      parseExtensionToRecorder({ type: "CANCEL_SESSION", sessionId: "sess-1" }).type,
    ).toBe("CANCEL_SESSION");
  });

  it("parses SETTINGS_UPDATED", () => {
    const message = parseExtensionToRecorder({
      type: "SETTINGS_UPDATED",
      settings: { spokenPunctuation: false },
    });

    expect(message.type).toBe("SETTINGS_UPDATED");
  });

  it("parses PING", () => {
    const message = parseExtensionToRecorder({
      type: "PING",
      id: "ping-1",
    });

    expect(message).toEqual({ type: "PING", id: "ping-1" });
  });

  it("rejects unknown protocol version on HELLO_ACK", () => {
    expect(() =>
      parseExtensionToRecorder({
        type: "HELLO_ACK",
        protocolVersion: 99,
        extensionState: { recorderConnected: false },
      }),
    ).toThrow(ProtocolParseError);
  });

  it("rejects START_SESSION without session id", () => {
    expect(() =>
      parseExtensionToRecorder({
        type: "START_SESSION",
        sessionId: "",
        config: {
          activationMode: "toggle",
          languageHint: "en",
          spokenPunctuation: true,
          appendSpace: false,
        },
      }),
    ).toThrow(ProtocolParseError);
  });
});
