export interface ImeTextPort {
  hasValidContext(): boolean;
  commitText(text: string): Promise<boolean>;
}

export interface StreamHandlers {
  onPartial(text: string): void;
  onCommitted(text: string): void;
  onError(message: string): void;
  onClose(): void;
}

export interface RecorderPort {
  start(sessionId: string, handlers: StreamHandlers): Promise<void>;
  stop(): Promise<void>;
  cancel(): void;
}

export interface RecorderStatusPort {
  show(message: string, options?: { busy?: boolean; error?: boolean }): void;
  hide(): void;
  setPartial(text: string): void;
}

export interface LoggerPort {
  warn(message: string): void;
  error(message: string): void;
}
