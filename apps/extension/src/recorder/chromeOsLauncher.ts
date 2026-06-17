import type { RecorderLauncher } from "../recorder/launcher.js";

export interface ChromeRuntime {
  sendMessage(extensionId: string, message: unknown): Promise<unknown>;
}

export function createChromeOsRecorderLauncher(options: {
  recorderExtensionId: string;
  runtime: ChromeRuntime;
}): RecorderLauncher {
  return {
    async launch() {
      await options.runtime.sendMessage(options.recorderExtensionId, {
        type: "LAUNCH_RECORDER",
      });
    },
  };
}
