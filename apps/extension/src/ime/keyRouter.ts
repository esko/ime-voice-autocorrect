export type KeyEventName = "keydown" | "keyup";

export interface RoutedKey {
  key: string;
  type: KeyEventName;
}

export interface KeyRouterOptions {
  onDictationDown?: () => void;
  onDictationUp?: () => void;
  onEscape?: () => void;
  dictationKey?: string;
}

export class KeyRouter {
  private readonly onDictationDown: () => void;
  private readonly onDictationUp: () => void;
  private readonly onEscape: () => void;
  private readonly dictationKey: string;

  constructor(options: KeyRouterOptions = {}) {
    this.onDictationDown = options.onDictationDown ?? (() => {});
    this.onDictationUp = options.onDictationUp ?? (() => {});
    this.onEscape = options.onEscape ?? (() => {});
    this.dictationKey = options.dictationKey ?? "AltRight";
  }

  route(key: string, type: KeyEventName): "dictation" | "escape" | "pass-through" {
    if (key === this.dictationKey) {
      if (type === "keydown") {
        this.onDictationDown();
        return "dictation";
      }
      this.onDictationUp();
      return "dictation";
    }

    if (key === "Escape" && type === "keydown") {
      this.onEscape();
      return "escape";
    }

    return "pass-through";
  }
}
