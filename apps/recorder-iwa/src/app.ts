import type { AudioPipelineFactory, RealtimeSocketFactory } from "./session/recorderSession.js";
import { RecorderBridgeClient } from "./bridge/client.js";
import type { RecorderBridgePort } from "./bridge/server.js";
import { RecorderBridgeServer } from "./bridge/server.js";
import { RecorderSessionController } from "./session/recorderSession.js";
import { SettingsStore, DEFAULT_RECORDER_SETTINGS } from "./settings/store.js";
import { mergeSharedSettingsIntoRecorder } from "./settings/publishSnapshot.js";
import { RecorderUiController } from "./ui/recorderUi.js";

export function createRecorderApp(options: {
  extensionId: string;
  createPort: () => RecorderBridgePort;
  socketFactory: RealtimeSocketFactory;
  audioPipelineFactory?: AudioPipelineFactory;
  storage: ConstructorParameters<typeof SettingsStore>[0];
}) {
  const settings = new SettingsStore(options.storage);
  const ui = new RecorderUiController();
  let sessionController: RecorderSessionController | null = null;
  const bridgeServer = new RecorderBridgeServer({
    onExtensionMessage: async (message) => {
      if (message.type === "START_SESSION") {
        ui.setListening();
        sessionController = new RecorderSessionController(
          options.socketFactory,
          {
            onPartial: (text) => {
              if (settings.load().showPartialTranscript) {
                ui.setPartial(text);
              }
              bridgeServer.send({
                type: "PARTIAL_TRANSCRIPT",
                sessionId: message.sessionId,
                text,
              });
            },
            onCommitted: (text) => {
              bridgeServer.send({
                type: "COMMITTED_TRANSCRIPT",
                sessionId: message.sessionId,
                text,
              });
            },
            onError: (errorMessage) => {
              ui.setError(errorMessage);
              bridgeServer.send({
                type: "SESSION_ERROR",
                sessionId: message.sessionId,
                message: errorMessage,
                recoverable: false,
              });
            },
            onAudioLevel: (rms) => {
              ui.setLevel(rms);
              bridgeServer.send({
                type: "AUDIO_LEVEL",
                sessionId: message.sessionId,
                rms,
              });
            },
          },
          options.audioPipelineFactory,
          () => {
            const recorderSettings = settings.load();
            return {
              noiseGate: recorderSettings.elevenLabsNoiseGate,
              inputDeviceId: recorderSettings.elevenLabsInputDeviceId || undefined,
            };
          },
        );
        await sessionController.startSession(message.sessionId, message.config);
        bridgeServer.send({ type: "SESSION_STARTED", sessionId: message.sessionId });
      }

      if (message.type === "STOP_SESSION" && sessionController) {
        await sessionController.stopSession();
        ui.setIdle();
        bridgeServer.send({
          type: "SESSION_CLOSED",
          sessionId: message.sessionId,
          reason: "stopped",
        });
        sessionController = null;
      }

      if (message.type === "CANCEL_SESSION") {
        sessionController?.cancelSession();
        sessionController = null;
        ui.setIdle();
        bridgeServer.send({
          type: "SESSION_CLOSED",
          sessionId: message.sessionId,
          reason: "cancelled",
        });
      }

      if (message.type === "SETTINGS_UPDATED") {
        const merged = mergeSharedSettingsIntoRecorder(settings.load(), message.settings);
        settings.save(merged);
      }
    },
  });

  const bridgeClient = new RecorderBridgeClient({
    extensionId: options.extensionId,
    appId: "input-assist-recorder",
    connect: () => {
      const port = options.createPort();
      bridgeServer.attach(port);
      return port;
    },
    onReady: () => {
      bridgeServer.send({
        type: "SETTINGS_SNAPSHOT",
        settings: settings.toSharedSnapshot(settings.load()),
      });
      bridgeServer.send({
        type: "RECORDER_READY",
        capabilities: { asrProvider: "elevenlabs-realtime" },
      });
    },
  });

  return {
    settings,
    ui,
    bridgeClient,
    bridgeServer,
    getSessionController: () => sessionController,
    defaultSettings: DEFAULT_RECORDER_SETTINGS,
  };
}
