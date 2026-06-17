import type { RealtimeSocket } from "./asr/realtimeSocket.js";
import { RecorderBridgeClient } from "./bridge/client.js";
import type { RecorderBridgePort } from "./bridge/server.js";
import { RecorderBridgeServer } from "./bridge/server.js";
import { RecorderSessionController } from "./session/recorderSession.js";
import { SettingsStore, DEFAULT_RECORDER_SETTINGS } from "./settings/store.js";

export function createRecorderApp(options: {
  extensionId: string;
  createPort: () => RecorderBridgePort;
  socketFactory: () => RealtimeSocket;
  storage: ConstructorParameters<typeof SettingsStore>[0];
}) {
  const settings = new SettingsStore(options.storage);
  let sessionController: RecorderSessionController | null = null;
  let bridgeServer: RecorderBridgeServer;

  bridgeServer = new RecorderBridgeServer({
    onExtensionMessage: async (message) => {
      if (message.type === "START_SESSION") {
        sessionController = new RecorderSessionController(options.socketFactory, {
          onPartial: (text) => {
            bridgeServer.send({
              type: "PARTIAL_TRANSCRIPT",
              sessionId: message.sessionId,
              text,
            });
          },
          onFinal: (text) => {
            bridgeServer.send({
              type: "FINAL_TRANSCRIPT",
              sessionId: message.sessionId,
              text,
            });
          },
          onError: (errorMessage) => {
            bridgeServer.send({
              type: "SESSION_ERROR",
              sessionId: message.sessionId,
              message: errorMessage,
              recoverable: false,
            });
          },
        });
        await sessionController.startSession(message.sessionId, message.config);
        bridgeServer.send({ type: "SESSION_STARTED", sessionId: message.sessionId });
      }

      if (message.type === "STOP_SESSION" && sessionController) {
        sessionController.stopSession();
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
        bridgeServer.send({
          type: "SESSION_CLOSED",
          sessionId: message.sessionId,
          reason: "cancelled",
        });
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
    bridgeClient,
    bridgeServer,
    getSessionController: () => sessionController,
    defaultSettings: DEFAULT_RECORDER_SETTINGS,
  };
}
