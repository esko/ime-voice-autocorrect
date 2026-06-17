import type { AudioInputDevice } from "./audioDevices.js";

export function populateInputDeviceSelect(
  select: HTMLSelectElement,
  devices: readonly AudioInputDevice[],
  selectedDeviceId: string,
): void {
  select.replaceChildren();

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "System default";
  select.append(defaultOption);

  for (const device of devices) {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label;
    select.append(option);
  }

  select.value = selectedDeviceId;
}
