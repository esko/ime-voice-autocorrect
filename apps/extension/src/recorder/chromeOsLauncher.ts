import type { RecorderLauncher } from "./launcher.js";
import { buildRecorderLaunchUrl } from "./launchUrl.js";

export interface ChromeTabsApi {
  create(properties: { url: string; active: boolean }): Promise<unknown>;
}

export interface RecorderLaunchStorage {
  get(keys: string[]): Promise<Record<string, unknown>>;
}

const RECORDER_ORIGIN_KEY = "recorderBaseOrigin";

export function createChromeOsRecorderLauncher(options: {
  extensionId: string;
  tabs: ChromeTabsApi;
  storage: RecorderLaunchStorage;
}): RecorderLauncher {
  return {
    async launch() {
      const stored = await options.storage.get([RECORDER_ORIGIN_KEY]);
      const baseOrigin = stored[RECORDER_ORIGIN_KEY];
      if (typeof baseOrigin !== "string" || !baseOrigin) {
        return;
      }

      await options.tabs.create({
        url: buildRecorderLaunchUrl(baseOrigin, options.extensionId),
        active: false,
      });
    },
  };
}

export { RECORDER_ORIGIN_KEY };
