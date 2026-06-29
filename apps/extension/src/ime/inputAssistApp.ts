import type { UserModel, Validator, ContextModel, Dictionary, RepRules } from "@input-assist/autocorrect-core";
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
      pendingCorrection = { original, replacement: corrected };
      void assistiveUndo?.showCorrection(contextId, original, corrected);
    },
    onCorrectionUndone: () => {
      stateManager.clearCorrectionUndo();
      assistiveUndo?.hide();
    },
  });

  // Commit + learning for a chosen suggestion, shared by mouse clicks and
  // number-key selection.
  const applySuggestion = async (candidateId: number): Promise<void> => {
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
  };

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
    setContext(context: ContextModel) {
      autocorrect.setContext(context);
    },
    setRepRules(repRules: RepRules) {
      autocorrect.setRepRules(repRules);
    },
    setDictionary(dictionary: Dictionary) {
      autocorrect.setDictionary(dictionary);
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
    onCandidateClicked(candidateId: number) {
      return applySuggestion(candidateId);
    },
    /** True while a suggestion (candidate) window is open. */
    hasPendingSuggestion(): boolean {
      return suggestions?.hasPending() ?? false;
    },
    /** Pick the suggestion at `index` via a number key; returns whether it was consumed. */
    selectSuggestionByNumber(index: number): boolean {
      const count = suggestions?.pendingCount() ?? 0;
      if (index < 0 || index >= count) {
        return false;
      }
      void applySuggestion(index);
      return true;
    },
    /**
     * Handle a typed character at a (possible) word boundary. Returns whether the
     * key was consumed: an auto-replacement consumes the boundary key and
     * re-emits the delimiter itself (so the space is never swallowed); everything
     * else passes through. The replacement/commit runs asynchronously but the
     * decision and undo bookkeeping are synchronous.
     */
    handleCharacter(contextId: number, character: string): boolean {
      assistiveUndo?.hide();
      suggestions?.dismiss();
      // Typing past a correction without undoing it counts as acceptance.
      recordAcceptanceOfPendingCorrection();
      const prior = stateManager.getPreviousToken()?.text ?? "";
      const previousWords = stateManager.getPreviousWords();
      stateManager.noteCommittedText(character);
      if (!stateManager.canAutocorrect()) {
        return false;
      }
      const evaluation = autocorrect.evaluate(prior, character, previousWords);
      if (!evaluation) {
        return false;
      }
      const { token, decision } = evaluation;
      if (decision.action === "replace") {
        stateManager.noteReplacement(token, decision.replacement);
        void autocorrect.commitReplacement(contextId, token, decision.replacement, character);
        return true;
      }
      if (decision.action === "suggest") {
        suggestions?.offer(activeEngineId ?? "", contextId, token, character, decision.candidates);
      }
      return false;
    },
  };
}
