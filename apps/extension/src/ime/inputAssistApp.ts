import { AutocorrectImeAdapter } from "../autocorrect/adapter.js";
import { ExtensionBridgeServer } from "../bridge/server.js";
import { DictationService } from "../dictation/dictationService.js";
import { ContextTracker } from "../ime/contextTracker.js";
import { KeyRouter } from "../ime/keyRouter.js";
import { isDictationAllowed } from "../ime/unsafeField.js";
import { PendingRecorderLauncher } from "../recorder/launcher.js";
import type { RecorderToExtensionMessage } from "@input-assist/protocol";
import { DEFAULT_DICTATION_CONFIG } from "@input-assist/dictation-core";
import { ExtensionSettingsCache } from "../storage/settingsCache.js";

export interface InputAssistAppOptions {
  allowedOrigin: string;
  launchRecorder: () => Promise<void>;
  imeAdapter: ConstructorParameters<typeof DictationService>[0]["imeAdapter"];
  createSessionId?: () => string;
  settingsCache?: ExtensionSettingsCache;
}

export function createInputAssistApp(options: InputAssistAppOptions) {
  const contexts = new ContextTracker();
  let activeContextType: string | undefined;

  const dictationHolder: { service: DictationService | null } = { service: null };

  const bridge = new ExtensionBridgeServer({
    allowedOrigin: options.allowedOrigin,
    onRecorderMessage: (message: RecorderToExtensionMessage) => {
      if (message.type === "SETTINGS_SNAPSHOT" && options.settingsCache) {
        void options.settingsCache.save(message.settings);
      }
      dictationHolder.service?.handleRecorderMessage(message);
    },
  });

  const launcher = new PendingRecorderLauncher(options.launchRecorder);

  const dictation = new DictationService({
    bridge,
    launcher,
    imeAdapter: options.imeAdapter,
    dictationConfig: DEFAULT_DICTATION_CONFIG,
    sessionConfig: {
      activationMode: "push-to-talk",
      languageHint: "auto",
      spokenPunctuation: true,
      appendSpace: false,
    },
    isDictationAllowed: () => isDictationAllowed(activeContextType),
    createSessionId: options.createSessionId,
  });
  dictationHolder.service = dictation;

  const autocorrect = new AutocorrectImeAdapter({
    deleteSurroundingText: async (contextId, length) => {
      if (options.imeAdapter.getContextId() === contextId) {
        await options.imeAdapter.deleteSurroundingText(length);
      }
    },
    commitText: async (contextId, text) => {
      if (options.imeAdapter.getContextId() === contextId) {
        await options.imeAdapter.commitText(text);
      }
    },
  });

  const textBuffers = new Map<number, string>();

  const keyRouter = new KeyRouter({
    onDictationDown: () => {
      void dictation.onDictationChordDown();
    },
    onDictationUp: () => dictation.onDictationChordUp(),
    onEscape: () => dictation.onEscape(),
  });

  return {
    contexts,
    bridge,
    dictation,
    launcher,
    keyRouter,
    autocorrect,
    textBuffers,
    setActiveContextType(type: string | undefined) {
      activeContextType = type;
    },
    onFocus(engineId: string, context: chrome.input.ime.InputContext) {
      contexts.onFocus(engineId, context);
      activeContextType = context.type;
      textBuffers.set(context.contextID, "");
    },
    onBlur(contextId: number) {
      contexts.onBlur(contextId);
      dictation.onContextLost();
      textBuffers.delete(contextId);
      activeContextType = undefined;
    },
    async onCharacterTyped(contextId: number, character: string) {
      const buffer = (textBuffers.get(contextId) ?? "") + character;
      textBuffers.set(contextId, buffer);
      await autocorrect.onCharacterTyped(contextId, buffer, character);
      if (character === " ") {
        textBuffers.set(contextId, "");
      }
    },
  };
}
