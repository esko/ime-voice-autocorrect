import type { UserModel, Validator } from "@input-assist/autocorrect-core";
import { AutocorrectImeAdapter } from "../autocorrect/adapter.js";
import { InputStateManager } from "../ime/inputStateManager.js";
import type { ExtensionSettingsCache } from "../storage/settingsCache.js";
import type { ExtensionImePreferences } from "../storage/imePreferences.js";
import { DEFAULT_IME_PREFERENCES } from "../storage/imePreferences.js";
import type { ChromeImeTextAdapter } from "./chromeImeAdapter.js";
import type { ChromeImeUiAdapter } from "./chromeImeUiAdapter.js";
import { AssistiveUndoController } from "./chromeImeUiAdapter.js";
import { ImeMenuController } from "./imeMenuController.js";
import { SuggestionController } from "./suggestionController.js";

export interface InputAssistAppOptions {
  imeAdapter: ChromeImeTextAdapter;
  settingsCache?: ExtensionSettingsCache;
  imePreferences?: ExtensionImePreferences;
  imeUi?: ChromeImeUiAdapter;
  userModel?: UserModel;
  /** Called after the user model changes so the host can persist it. */
  persistLearning?: () => void;
}

export function createInputAssistApp(options: InputAssistAppOptions) {
  const stateManager = new InputStateManager();
  const assistiveUndo = options.imeUi ? new AssistiveUndoController(options.imeUi) : null;

  let menuController: ImeMenuController | null = null;
  let activeEngineId: string | null = null;
  // A just-applied auto-correction, pending accept/reject feedback.
  let pendingCorrection: { original: string; replacement: string } | null = null;

  const recordAcceptanceOfPendingCorrection = () => {
    if (!pendingCorrection) {
      return;
    }
    options.userModel?.recordAccepted(pendingCorrection.original, pendingCorrection.replacement);
    pendingCorrection = null;
    options.persistLearning?.();
  };

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

  // Context-gated text operations shared by autocorrect and suggestions.
  const imeTextAdapter = {
    deleteSurroundingText: async (contextId: number, length: number) => {
      if (options.imeAdapter.getContextId() === contextId) {
        await options.imeAdapter.deleteSurroundingText(length);
      }
    },
    commitText: async (contextId: number, text: string) => {
      if (options.imeAdapter.getContextId() === contextId) {
        await options.imeAdapter.commitText(text);
      }
    },
  };

  const suggestions = options.imeUi
    ? new SuggestionController(options.imeUi, imeTextAdapter)
    : null;

  const autocorrect = new AutocorrectImeAdapter(imeTextAdapter, {
    userModel: options.userModel,
    onCorrectionApplied: (contextId, original, corrected) => {
      suggestions?.dismiss();
      pendingCorrection = { original, replacement: corrected };
      stateManager.noteReplacement(original, corrected);
      void assistiveUndo?.showCorrection(contextId, original, corrected);
    },
    onCorrectionUndone: () => {
      stateManager.clearCorrectionUndo();
      assistiveUndo?.hide();
    },
    onSuggest: suggestions
      ? (contextId, original, delimiter, candidates) => {
          suggestions.offer(activeEngineId ?? "", contextId, original, delimiter, candidates);
        }
      : undefined,
  });

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
    setValidator(validator: Validator) {
      autocorrect.setValidator(validator);
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
      suggestions?.dismiss();
      pendingCorrection = null;
    },
    /** Backspace (or the undo button) right after a correction = a rejection. */
    recordRejection(original: string, replacement: string) {
      options.userModel?.recordRejected(original, replacement);
      pendingCorrection = null;
      options.persistLearning?.();
    },
    async onCandidateClicked(candidateId: number) {
      const applied = await suggestions?.select(candidateId);
      if (!applied) {
        return;
      }
      options.userModel?.recordAccepted(applied.original, applied.replacement);
      options.persistLearning?.();
      stateManager.noteReplacement(applied.original, applied.replacement);
      const contextId = stateManager.getActiveContextId();
      if (contextId !== null) {
        void assistiveUndo?.showCorrection(contextId, applied.original, applied.replacement);
      }
    },
    async onCharacterTyped(contextId: number, character: string) {
      assistiveUndo?.hide();
      suggestions?.dismiss();
      // Typing past a correction without undoing it counts as acceptance.
      recordAcceptanceOfPendingCorrection();
      const prior = stateManager.getPreviousToken()?.text ?? "";
      const previousWords = stateManager.getPreviousWords();
      stateManager.noteCommittedText(character);
      if (stateManager.canAutocorrect()) {
        await autocorrect.onCharacterTyped(contextId, prior, character, previousWords);
      }
    },
  };
}
