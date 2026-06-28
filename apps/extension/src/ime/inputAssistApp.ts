import { AutocorrectImeAdapter } from "../autocorrect/adapter.js";
import { ExtensionBridgeServer } from "../bridge/server.js";
import { DictationService } from "../dictation/dictationService.js";
import { InputStateManager } from "../ime/inputStateManager.js";
import { KeyRouter } from "../ime/keyRouter.js";
import { PendingRecorderLauncher } from "../recorder/launcher.js";
import type { RecorderToExtensionMessage } from "@input-assist/protocol";
import { DEFAULT_DICTATION_CONFIG } from "@input-assist/dictation-core";
import { ExtensionSettingsCache } from "../storage/settingsCache.js";
import type { ExtensionImePreferences } from "../storage/imePreferences.js";
import { DEFAULT_IME_PREFERENCES } from "../storage/imePreferences.js";
import type { ChromeImeUiAdapter } from "./chromeImeUiAdapter.js";
import { AssistiveUndoController } from "./chromeImeUiAdapter.js";
import { ImeMenuController } from "./imeMenuController.js";

export const INPUT_ASSIST_ENGINE_IDS = ["input-assist-us", "input-assist-fi"] as const;

export interface InputAssistAppOptions {
  allowedOrigin: string;
  launchRecorder: () => Promise<void>;
  imeAdapter: ConstructorParameters<typeof DictationService>[0]["imeAdapter"];
  createSessionId?: () => string;
  settingsCache?: ExtensionSettingsCache;
  imePreferences?: ExtensionImePreferences;
  imeUi?: ChromeImeUiAdapter;
}

export function createInputAssistApp(options: InputAssistAppOptions) {
  const stateManager = new InputStateManager();

  const dictationHolder: { service: DictationService | null } = { service: null };
  const assistiveUndo = options.imeUi ? new AssistiveUndoController(options.imeUi) : null;

  let menuController: ImeMenuController | null = null;

  const refreshImeMenu = (engineId: string) => {
    menuController?.refresh(engineId);
  };

  const refreshAllImeMenus = () => {
    for (const engineId of INPUT_ASSIST_ENGINE_IDS) {
      refreshImeMenu(engineId);
    }
  };

  const syncMenuStatus = () => {
    menuController?.update({
      recorderConnected: bridge.isConnected(),
      dictationActive: dictation.isDictationActive(),
      autocorrectEnabled: autocorrect.isEnabled(),
      dictationEnabled: dictation.isDictationEnabled(),
    });
    refreshAllImeMenus();
  };

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
  }, {
    onCorrectionApplied: (contextId, original, corrected) => {
      stateManager.noteReplacement(original, corrected);
      void assistiveUndo?.showCorrection(contextId, original, corrected);
    },
    onCorrectionUndone: () => {
      stateManager.clearCorrectionUndo();
      assistiveUndo?.hide();
    },
  });

  if (options.imeUi) {
    menuController = new ImeMenuController(
      options.imeUi,
      {
        recorderConnected: false,
        dictationActive: false,
        autocorrectEnabled: DEFAULT_IME_PREFERENCES.autocorrectEnabled,
        dictationEnabled: DEFAULT_IME_PREFERENCES.dictationEnabled,
      },
      (state) => {
        autocorrect.setEnabled(state.autocorrectEnabled);
        dictation.setDictationEnabled(state.dictationEnabled);
        if (options.imePreferences) {
          void options.imePreferences.save({
            autocorrectEnabled: state.autocorrectEnabled,
            dictationEnabled: state.dictationEnabled,
          });
        }
      },
    );
  }

  const bridge = new ExtensionBridgeServer({
    allowedOrigin: options.allowedOrigin,
    onRecorderMessage: (message: RecorderToExtensionMessage) => {
      if (message.type === "SETTINGS_SNAPSHOT") {
        if (options.settingsCache) {
          void options.settingsCache.save(message.settings);
        }
        autocorrect.updateWordLists({
          personalDictionary: message.settings.personalDictionary,
          technicalDictionary: message.settings.technicalDictionary,
          ignoreList: message.settings.ignoreList,
        });
        dictation.applySharedSettings(message.settings);
      }
      dictationHolder.service?.handleRecorderMessage(message);
    },
    onRecorderDisconnect: () => {
      dictationHolder.service?.onRecorderDisconnected();
      syncMenuStatus();
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
    isDictationAllowed: () => stateManager.canDictate(),
    createSessionId: options.createSessionId,
  });
  dictationHolder.service = dictation;

  const keyRouter = new KeyRouter({
    onDictationDown: () => {
      void dictation.onDictationChordDown().then(() => syncMenuStatus());
    },
    onDictationUp: () => {
      dictation.onDictationChordUp();
      syncMenuStatus();
    },
    onEscape: () => {
      dictation.onEscape();
      syncMenuStatus();
    },
  });

  syncMenuStatus();

  return {
    stateManager,
    bridge,
    dictation,
    launcher,
    keyRouter,
    autocorrect,
    menuController,
    assistiveUndo,
    refreshImeMenu,
    refreshAllImeMenus,
    syncMenuStatus,
    async hydrateSettingsFromCache() {
      if (!options.settingsCache) {
        return;
      }
      const cached = await options.settingsCache.load();
      if (!cached) {
        return;
      }
      autocorrect.updateWordLists({
        personalDictionary: cached.personalDictionary,
        technicalDictionary: cached.technicalDictionary,
        ignoreList: cached.ignoreList,
      });
      dictation.applySharedSettings(cached);
    },
    async hydrateImePreferences() {
      if (!options.imePreferences || !menuController) {
        return;
      }
      const preferences = await options.imePreferences.load();
      menuController.update({
        autocorrectEnabled: preferences.autocorrectEnabled,
        dictationEnabled: preferences.dictationEnabled,
      });
      autocorrect.setEnabled(preferences.autocorrectEnabled);
      dictation.setDictationEnabled(preferences.dictationEnabled);
      refreshAllImeMenus();
    },
    onFocus(engineId: string, context: chrome.input.ime.InputContext) {
      stateManager.onFocus(context);
    },
    onBlur(contextId: number) {
      stateManager.onBlur(contextId);
      dictation.onContextLost();
    },
    async onCharacterTyped(contextId: number, character: string) {
      assistiveUndo?.hide();
      const prior = stateManager.getPreviousToken()?.text ?? "";
      stateManager.noteCommittedText(character);
      if (stateManager.canAutocorrect()) {
        await autocorrect.onCharacterTyped(contextId, prior, character);
      }
    },
  };
}
