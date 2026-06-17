import { DictationSession } from "@input-assist/dictation-core";
import type { DictationConfig } from "@input-assist/dictation-core";
import type { DictationSessionConfig, RecorderToExtensionMessage, SharedSettings } from "@input-assist/protocol";
import type { ExtensionBridgeServer } from "../bridge/server.js";
import type { RecorderLauncher } from "../recorder/launcher.js";
import { BridgeRecorderPort } from "./bridgeRecorderPort.js";
import type { ChromeImeTextAdapter } from "./imeTextPort.js";
import { createImeTextPort } from "./imeTextPort.js";
import {
  sharedSettingsToDictationConfig,
  sharedSettingsToSessionConfig,
} from "../settings/applySharedSettings.js";

export interface DictationServiceOptions {
  bridge: ExtensionBridgeServer;
  launcher: RecorderLauncher;
  imeAdapter: ChromeImeTextAdapter;
  dictationConfig: DictationConfig;
  sessionConfig: DictationSessionConfig;
  isDictationAllowed: () => boolean;
  createSessionId?: () => string;
}

export class DictationService {
  private readonly bridge: ExtensionBridgeServer;
  private readonly bridgeRecorder: BridgeRecorderPort;
  private readonly session: DictationSession;
  private readonly launcher: RecorderLauncher;
  private readonly isDictationAllowed: () => boolean;
  private sessionConfig: DictationSessionConfig;

  constructor(options: DictationServiceOptions) {
    this.bridge = options.bridge;
    this.launcher = options.launcher;
    this.isDictationAllowed = options.isDictationAllowed;
    this.sessionConfig = options.sessionConfig;
    this.bridgeRecorder = new BridgeRecorderPort(this.bridge, options.sessionConfig);

    this.session = new DictationSession({
      ime: createImeTextPort(options.imeAdapter),
      recorder: this.bridgeRecorder,
      status: { show: () => {}, hide: () => {}, setPartial: () => {} },
      logger: { warn: () => {}, error: () => {} },
      config: options.dictationConfig,
      createSessionId: options.createSessionId,
    });
  }

  applySharedSettings(settings: SharedSettings): void {
    this.sessionConfig = sharedSettingsToSessionConfig(settings, this.sessionConfig);
    this.bridgeRecorder.updateSessionConfig(this.sessionConfig);
    this.session.updateConfig(sharedSettingsToDictationConfig(settings));
  }

  handleRecorderMessage(message: RecorderToExtensionMessage): void {
    if (message.type === "PARTIAL_TRANSCRIPT") {
      this.bridgeRecorder.onPartial(message.text);
    }
    if (message.type === "FINAL_TRANSCRIPT") {
      this.bridgeRecorder.onFinalTranscript(message.text);
    }
    if (message.type === "SESSION_ERROR") {
      this.bridgeRecorder.onError(message.message);
    }
  }

  async onDictationChordDown(): Promise<void> {
    if (!this.isDictationAllowed()) {
      return;
    }
    if (!this.bridge.isConnected()) {
      await this.launcher.launch();
    }
    this.session.onDictationChordDown();
  }

  onDictationChordUp(): void {
    this.session.onDictationChordUp();
  }

  onEscape(): void {
    this.session.onEscape();
  }

  onContextLost(): void {
    this.session.onContextLost();
  }

  onRecorderDisconnected(): void {
    if (this.session.isRunning()) {
      this.session.onEscape();
    }
  }
}
