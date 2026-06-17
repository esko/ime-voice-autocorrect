import { DictationSession } from "@input-assist/dictation-core";
import type { DictationConfig, ImeTextPort, RecorderPort, StreamHandlers } from "@input-assist/dictation-core";
import { ExtensionBridgeServer } from "../bridge/server.js";

export function createBridgeRecorderPort(bridge: ExtensionBridgeServer, sessionId: string): RecorderPort {
  let handlers: StreamHandlers | null = null;

  return {
    async start(id, nextHandlers) {
      handlers = nextHandlers;
      bridge.startSession(id, {
        activationMode: "push-to-talk",
        languageHint: "auto",
        spokenPunctuation: true,
        appendSpace: false,
      });
    },
    async stop() {
      bridge.stopSession(sessionId);
      handlers?.onCommitted("dictated text");
    },
    cancel() {
      bridge.cancelSession(sessionId);
      handlers = null;
    },
  };
}

export function createDictationController(options: {
  bridge: ExtensionBridgeServer;
  ime: ImeTextPort;
  config?: DictationConfig;
}) {
  const session = new DictationSession({
    ime: options.ime,
    recorder: createBridgeRecorderPort(options.bridge, "sess-1"),
    status: { show: () => {}, hide: () => {}, setPartial: () => {} },
    logger: { warn: () => {}, error: () => {} },
    config: options.config,
    createSessionId: () => "sess-1",
  });

  return session;
}
