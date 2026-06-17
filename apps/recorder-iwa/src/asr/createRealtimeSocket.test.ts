import { describe, expect, it } from "vitest";
import { buildRealtimeWebSocketUrl } from "./createRealtimeSocket.js";

describe("buildRealtimeWebSocketUrl", () => {
  it("includes pcm params and optional language code", () => {
    const autoUrl = new URL(buildRealtimeWebSocketUrl("token-1", "auto"));
    expect(autoUrl.searchParams.get("token")).toBe("token-1");
    expect(autoUrl.searchParams.get("encoding")).toBe("pcm_s16le");
    expect(autoUrl.searchParams.get("sample_rate")).toBe("16000");
    expect(autoUrl.searchParams.get("language_code")).toBeNull();

    const fiUrl = new URL(buildRealtimeWebSocketUrl("token-2", "fi"));
    expect(fiUrl.searchParams.get("language_code")).toBe("fi");
  });

  it("appends personal dictionary terms as repeated keyterms params", () => {
    const url = new URL(buildRealtimeWebSocketUrl("token-3", "auto", ["Input Assist", "Symspell"]));
    expect(url.searchParams.getAll("keyterms")).toEqual(["Input Assist", "Symspell"]);
  });
});
