import { describe, expect, it, vi } from "vitest";
import { ELEVENLABS_REALTIME_TOKEN_URL, fetchElevenLabsRealtimeToken } from "./elevenLabsToken.js";

describe("fetchElevenLabsRealtimeToken", () => {
  it("requests a single-use realtime token with the api key header", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ token: "rt-token" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchElevenLabsRealtimeToken("sk_test")).resolves.toBe("rt-token");
    expect(fetchMock).toHaveBeenCalledWith(ELEVENLABS_REALTIME_TOKEN_URL, {
      method: "POST",
      headers: { "xi-api-key": "sk_test" },
    });
  });
});
