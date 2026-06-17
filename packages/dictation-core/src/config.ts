export type ActivationMode = "push-to-talk" | "toggle";

export interface DictationConfig {
  activationMode: ActivationMode;
  spokenPunctuation: boolean;
  appendSpace: boolean;
}

export const DEFAULT_DICTATION_CONFIG: DictationConfig = {
  activationMode: "push-to-talk",
  spokenPunctuation: true,
  appendSpace: false,
};
