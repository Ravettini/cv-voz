import { EndSensitivity, StartSensitivity } from "@google/genai";
import { env } from "./env.js";

export const geminiConfig = {
  apiKey: env.GEMINI_API_KEY,
  textModel: env.GEMINI_TEXT_MODEL,
  liveModel: env.GEMINI_LIVE_MODEL,
  outputVoice: env.GEMINI_OUTPUT_VOICE,
  liveApiVersion: "v1alpha" as const,
};

export function liveSpeechConfig() {
  return {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: geminiConfig.outputVoice,
      },
    },
  };
}

/**
 * VAD del servidor con silencio largo para no cortar respuestas.
 * Debe coincidir exactamente en token efímero + cliente Live.
 */
export function liveRealtimeInputConfig() {
  return {
    automaticActivityDetection: {
      disabled: false,
      startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW,
      endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
      prefixPaddingMs: 400,
      silenceDurationMs: 1400,
    },
  };
}
