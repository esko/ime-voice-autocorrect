import { describe, expect, it } from "vitest";
import { RecorderSessionController } from "./recorderSession.js";

describe("RecorderSessionController", () => {
  it("accumulates committed chunks and returns one final transcript on stop", async () => {
    const finals: string[] = [];
    const controller = new RecorderSessionController(
      () =>
        ({
          connect: async () => {},
          sendAudio: () => {},
          stop: async () => {},
          cancel: () => {},
          shouldReconnect: () => false,
        }) as never,
      {
        onPartial: () => {},
        onFinal: (text) => finals.push(text),
        onError: () => {},
      },
    );

    await controller.startSession("sess-1", {
      activationMode: "push-to-talk",
      languageHint: "auto",
      spokenPunctuation: true,
      appendSpace: false,
    });
    controller.appendCommitted("hello");
    controller.appendCommitted("world");
    controller.stopSession();

    expect(finals).toEqual(["hello world"]);
  });
});
