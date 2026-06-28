export type ContextToken = { contextId: number; generation: number };

export interface ImeTextPort {
  getContextId(): number | null;
  getContextToken(): ContextToken | null;
  hasValidContext(targetToken?: ContextToken | number): boolean;
  commitText(text: string, targetToken?: ContextToken | number): Promise<boolean>;
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
