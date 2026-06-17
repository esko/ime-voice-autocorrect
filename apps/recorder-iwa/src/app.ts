import { RecorderBridgeClient } from "./bridge/client.js";

export function createRecorderApp(extensionId: string) {
  return new RecorderBridgeClient({
    extensionId,
    appId: "input-assist-recorder",
    connect: () => {
      throw new Error("Bridge connect is not configured");
    },
  });
}

export { RecorderBridgeClient };
