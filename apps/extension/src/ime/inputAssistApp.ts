import { AutocorrectImeAdapter } from "../autocorrect/adapter.js";
import { InputStateManager } from "../ime/inputStateManager.js";
import type { ExtensionSettingsCache } from "../storage/settingsCache.js";
import type { ExtensionImePreferences } from "../storage/imePreferences.js";
import { DEFAULT_IME_PREFERENCES } from "../storage/imePreferences.js";
import type { ChromeImeTextAdapter } from "./chromeImeAdapter.js";
import type { ChromeImeUiAdapter } from "./chromeImeUiAdapter.js";
import { AssistiveUndoController } from "./chromeImeUiAdapter.js";
import { ImeMenuController } from "./imeMenuController.js";

export interface InputAssistAppOptions {
  imeAdapter: ChromeImeTextAdapter;
  settingsCache?: ExtensionSettingsCache;
  imePreferences?: ExtensionImePreferences;
  imeUi?: ChromeImeUiAdapter;
}

export function createInputAssistApp(options: InputAssistAppOptions) {
  const stateManager = new InputStateManager();
  const assistiveUndo = options.imeUi ? new AssistiveUndoController(options.imeUi) : null;

  let menuController: ImeMenuController | null = null;
  let activeEngineId: string | null = null;

  // ChromeOS rejects input.ime.setMenuItems unless it targets the engine that
  // is currently active, so every menu repaint is gated on an active engine.
  const refreshActiveImeMenu = () => {
    if (activeEngineId === null) {
      return;
    }
    menuController?.refresh(activeEngineId);
  };

  const syncMenuStatus = () => {
    menuController?.update({ autocorrectEnabled: autocorrect.isEnabled() });
    refreshActiveImeMenu();
  };

  const autocorrect = new AutocorrectImeAdapter(
    {
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
    },
    {
      onCorrectionApplied: (contextId, original, corrected) => {
        stateManager.noteReplacement(original, corrected);
        void assistiveUndo?.showCorrection(contextId, original, corrected);
      },
      onCorrectionUndone: () => {
        stateManager.clearCorrectionUndo();
        assistiveUndo?.hide();
      },
    },
  );

  if (options.imeUi) {
    menuController = new ImeMenuController(
      options.imeUi,
      { autocorrectEnabled: DEFAULT_IME_PREFERENCES.autocorrectEnabled },
      (state) => {
        autocorrect.setEnabled(state.autocorrectEnabled);
        if (options.imePreferences) {
          void options.imePreferences.save({ autocorrectEnabled: state.autocorrectEnabled });
        }
      },
    );
  }

  return {
    stateManager,
    autocorrect,
    menuController,
    assistiveUndo,
    getActiveEngineId() {
      return activeEngineId;
    },
    onActivate(engineId: string) {
      activeEngineId = engineId;
      refreshActiveImeMenu();
    },
    onDeactivated(engineId: string) {
      if (activeEngineId === engineId) {
        activeEngineId = null;
      }
    },
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
    },
    async hydrateImePreferences() {
      if (!options.imePreferences || !menuController) {
        return;
      }
      const preferences = await options.imePreferences.load();
      menuController.update({ autocorrectEnabled: preferences.autocorrectEnabled });
      autocorrect.setEnabled(preferences.autocorrectEnabled);
      refreshActiveImeMenu();
    },
    onFocus(_engineId: string, context: chrome.input.ime.InputContext) {
      stateManager.onFocus(context);
    },
    onBlur(contextId: number) {
      stateManager.onBlur(contextId);
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
