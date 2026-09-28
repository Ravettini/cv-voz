import { EndSensitivity, GoogleGenAI, Modality, StartSensitivity } from "@google/genai";
import type { LiveCallbacks, LiveInterviewProvider } from "./types";
import { aiApi } from "@/services/interviewApi";

const CONNECT_TIMEOUT_MS = 20000;

const GREETING_TRIGGER =
  "Empezá ahora la entrevista. Saludame vos primero con tu mensaje de bienvenida y la primera pregunta. Todavía no respondí nada.";

export class GeminiLiveProvider implements LiveInterviewProvider {
  private session: {
    sendRealtimeInput: (payload: unknown) => void;
    sendClientContent: (payload: unknown) => void;
    close: () => void;
  } | null = null;
  private paused = false;
  private userBuffer = "";
  private assistantBuffer = "";
  private assistantSpeaking = false;
  private opened = false;
  /** Bloquea el mic hasta que el asistente termine el saludo. */
  private micEnabled = false;
  private greetingDone = false;

  constructor(private callbacks: LiveCallbacks) {}

  async connect(): Promise<void> {
    const tokenRes = await aiApi.liveToken();
    if (tokenRes.demo) {
      this.opened = true;
      this.micEnabled = true;
      this.greetingDone = true;
      this.callbacks.onOpen?.();
      this.callbacks.onAssistantTranscript?.(
        "Modo demostración activo. Podés continuar escribiendo tus respuestas.",
        true,
      );
      this.callbacks.onReadyForUser?.();
      return;
    }

    const ai = new GoogleGenAI({
      apiKey: tokenRes.token,
      httpOptions: { apiVersion: tokenRes.apiVersion || "v1alpha" },
    });

    const connectPromise = ai.live.connect({
      model: tokenRes.model,
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: tokenRes.voice || "Kore",
            },
          },
        },
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: false,
            startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW,
            endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
            prefixPaddingMs: 400,
            silenceDurationMs: 1400,
          },
        },
      },
      callbacks: {
        onopen: () => {
          this.opened = true;
          this.callbacks.onOpen?.();
        },
        onmessage: (message) => this.handleMessage(message as unknown as Record<string, unknown>),
        onerror: (e) => {
          const detail =
            typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "error";
          this.callbacks.onError?.(
            `No pudimos conectar con el asistente de voz (${detail}). Podés reintentar o escribir.`,
          );
        },
        onclose: () => {
          if (!this.opened) {
            this.callbacks.onError?.(
              "La conexión de voz se cerró antes de abrirse. Reintentá o continuá escribiendo.",
            );
          } else {
            this.callbacks.onClose?.();
          }
        },
      },
    });

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("TIMEOUT_LIVE_CONNECT")), CONNECT_TIMEOUT_MS);
    });

    try {
      this.session = (await Promise.race([connectPromise, timeout])) as typeof this.session;
    } catch (err) {
      try {
        this.session?.close();
      } catch {
        /* ignore */
      }
      this.session = null;
      if (err instanceof Error && err.message === "TIMEOUT_LIVE_CONNECT") {
        throw new Error("La conexión tardó demasiado. Reintentá o usá el modo texto.");
      }
      throw err instanceof Error ? err : new Error("No pudimos abrir la sesión de voz.");
    }

    if (!this.opened) {
      this.opened = true;
      this.callbacks.onOpen?.();
    }

    // Pedimos el saludo; el mic sigue bloqueado hasta turnComplete del asistente.
    this.micEnabled = false;
    try {
      this.session?.sendClientContent({
        turns: [{ role: "user", parts: [{ text: GREETING_TRIGGER }] }],
        turnComplete: true,
      });
    } catch {
      this.enableMic();
    }

    // Si el saludo no llega, no dejar al usuario trabado sin mic.
    setTimeout(() => {
      if (!this.greetingDone) this.enableMic();
    }, 12000);
  }

  private enableMic(): void {
    if (this.micEnabled) return;
    this.micEnabled = true;
    this.greetingDone = true;
    this.callbacks.onReadyForUser?.();
  }

  private handleMessage(message: Record<string, unknown>): void {
    const serverContent = message.serverContent as
      | {
          inputTranscription?: { text?: string };
          outputTranscription?: { text?: string };
          modelTurn?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
          turnComplete?: boolean;
        }
      | undefined;

    if (!serverContent) return;

    // No mostrar el trigger interno de saludo como si fuera el usuario.
    if (serverContent.inputTranscription?.text) {
      const chunk = serverContent.inputTranscription.text;
      if (!GREETING_TRIGGER.includes(chunk.trim()) && !chunk.includes("Empezá ahora la entrevista")) {
        this.userBuffer += chunk;
        this.callbacks.onUserTranscript?.(this.userBuffer, false);
      }
    }

    if (serverContent.outputTranscription?.text) {
      this.assistantBuffer += serverContent.outputTranscription.text;
      this.assistantSpeaking = true;
      this.callbacks.onSpeakingChange?.(true);
      this.callbacks.onAssistantTranscript?.(this.assistantBuffer, false);
    }

    const parts = serverContent.modelTurn?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        this.assistantSpeaking = true;
        this.callbacks.onSpeakingChange?.(true);
        this.callbacks.onAudio?.(part.inlineData.data);
      }
    }

    if (serverContent.turnComplete) {
      if (this.userBuffer.trim()) {
        this.callbacks.onUserTranscript?.(this.userBuffer.trim(), true);
        this.userBuffer = "";
      }
      const hadAssistant = Boolean(this.assistantBuffer.trim()) || this.assistantSpeaking;
      if (this.assistantBuffer.trim()) {
        this.callbacks.onAssistantTranscript?.(this.assistantBuffer.trim(), true);
        this.assistantBuffer = "";
      }
      this.assistantSpeaking = false;
      this.callbacks.onSpeakingChange?.(false);

      if (hadAssistant) {
        this.enableMic();
      }
    }
  }

  disconnect(): void {
    this.session?.close();
    this.session = null;
    this.opened = false;
    this.micEnabled = false;
    this.greetingDone = false;
  }

  isAssistantSpeaking(): boolean {
    return this.assistantSpeaking;
  }

  isMicEnabled(): boolean {
    return this.micEnabled;
  }

  isInUserActivity(): boolean {
    return this.micEnabled;
  }

  beginUserActivity(): void {
    /* VAD automático */
  }

  endUserActivity(): void {
    /* VAD automático */
  }

  sendAudio(base64Pcm: string): void {
    if (this.paused || !this.session || !this.micEnabled || this.assistantSpeaking) return;
    this.session.sendRealtimeInput({
      audio: { data: base64Pcm, mimeType: "audio/pcm;rate=16000" },
    });
  }

  /** Cierra el turno del usuario. El próximo audio vuelve a abrir el micrófono. */
  endUtterance(): void {
    if (this.paused || !this.session || !this.micEnabled || this.assistantSpeaking) return;
    this.session.sendRealtimeInput({ audioStreamEnd: true });
  }

  sendText(text: string): void {
    if (!this.session) return;
    this.session.sendClientContent({
      turns: [{ role: "user", parts: [{ text }] }],
      turnComplete: true,
    });
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }
}
