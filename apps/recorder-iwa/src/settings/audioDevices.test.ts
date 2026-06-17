import { describe, expect, it } from "vitest";
import { filterAudioInputDevices } from "./audioDevices.js";

describe("filterAudioInputDevices", () => {
  it("keeps audio input devices with ids", () => {
    expect(
      filterAudioInputDevices([
        { kind: "audioinput", deviceId: "mic-1", label: "Built-in Mic" },
        { kind: "audiooutput", deviceId: "spk-1", label: "Speaker" },
        { kind: "audioinput", deviceId: "", label: "Hidden" },
      ]),
    ).toEqual([{ deviceId: "mic-1", label: "Built-in Mic" }]);
  });
});
