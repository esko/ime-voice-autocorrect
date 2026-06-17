export const ELEVENLABS_REALTIME_TOKEN_URL =
  "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe";

export async function fetchElevenLabsRealtimeToken(apiKey: string): Promise<string> {
  const response = await fetch(ELEVENLABS_REALTIME_TOKEN_URL, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ElevenLabs realtime token (${response.status})`);
  }

  const body = (await response.json()) as { token?: string };
  if (!body.token) {
    throw new Error("ElevenLabs realtime token response missing token");
  }

  return body.token;
}
