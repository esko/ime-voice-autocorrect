export interface AudioInputDevice {
  deviceId: string;
  label: string;
}

export function filterAudioInputDevices(
  devices: Array<{ kind: string; deviceId: string; label: string }>,
): AudioInputDevice[] {
  return devices
    .filter((device) => device.kind === "audioinput" && device.deviceId)
    .map((device) => ({
      deviceId: device.deviceId,
      label: device.label || "Microphone",
    }));
}
