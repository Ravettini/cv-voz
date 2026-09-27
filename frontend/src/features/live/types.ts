export interface LiveInterviewProvider {
  connect(): Promise<void>;
  disconnect(): void;
  sendAudio(base64Pcm: string): void;
  sendText(text: string): void;
  pause(): void;
  resume(): void;
}

export type LiveCallbacks = {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (message: string) => void;
  onUserTranscript?: (text: string, final: boolean) => void;
  onAssistantTranscript?: (text: string, final: boolean) => void;
  onAudio?: (base64Pcm: string) => void;
  onSpeakingChange?: (speaking: boolean) => void;
  /** Se dispara cuando el asistente terminó el saludo y el mic ya puede enviar audio. */
  onReadyForUser?: () => void;
};
