export type RecorderUiState = "idle" | "listening" | "error";

export interface RecorderUiModel {
  state: RecorderUiState;
  partialText: string;
  errorMessage: string | null;
  level: number;
}

export class RecorderUiController {
  private model: RecorderUiModel = {
    state: "idle",
    partialText: "",
    errorMessage: null,
    level: 0,
  };

  getModel(): RecorderUiModel {
    return { ...this.model };
  }

  setListening(partialText = ""): void {
    this.model = {
      state: "listening",
      partialText,
      errorMessage: null,
      level: this.model.level,
    };
  }

  setPartial(partialText: string): void {
    if (this.model.state === "listening") {
      this.model = { ...this.model, partialText };
    }
  }

  setLevel(level: number): void {
    this.model = { ...this.model, level };
  }

  setIdle(): void {
    this.model = {
      state: "idle",
      partialText: "",
      errorMessage: null,
      level: 0,
    };
  }

  setError(message: string): void {
    this.model = {
      state: "error",
      partialText: "",
      errorMessage: message,
      level: 0,
    };
  }

  isInteractive(): boolean {
    return this.model.state === "idle";
  }
}
