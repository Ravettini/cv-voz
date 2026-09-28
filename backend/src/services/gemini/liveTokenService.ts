import { Modality } from "@google/genai";
import { INTERVIEWER_SYSTEM_PROMPT } from "../../prompts/interviewerSystemPrompt.js";
import { geminiConfig, liveRealtimeInputConfig, liveSpeechConfig } from "../../config/geminiConfig.js";
import { env, isDemoMode } from "../../config/env.js";
import { HttpError, humanizeGeminiError } from "../../middleware/errorHandler.js";
import { logger } from "../../utils/logger.js";
import { assertGeminiAvailable, getGeminiClient } from "./geminiService.js";

export interface LiveTokenResponse {
  token: string;
  model: string;
  apiVersion: string;
  expiresAt: string;
  demo: boolean;
  voice: string;
}

export async function createLiveEphemeralToken(): Promise<LiveTokenResponse> {
  assertGeminiAvailable();

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  if (isDemoMode() && !env.GEMINI_API_KEY) {
    return {
      token: "demo-live-token",
      model: geminiConfig.liveModel,
      apiVersion: geminiConfig.liveApiVersion,
      expiresAt,
      demo: true,
      voice: geminiConfig.outputVoice,
    };
  }

  try {
    const client = getGeminiClient();
    const token = await client.authTokens.create({
      config: {
        uses: 5,
        expireTime: expiresAt,
        newSessionExpireTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: geminiConfig.liveModel,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: INTERVIEWER_SYSTEM_PROMPT,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            speechConfig: liveSpeechConfig(),
            realtimeInputConfig: liveRealtimeInputConfig(),
          },
        },
        httpOptions: { apiVersion: geminiConfig.liveApiVersion },
      },
    });

    const name = token.name;
    if (!name) {
      throw new HttpError(502, "No pudimos iniciar la conversación por voz. Probá de nuevo.", "TOKEN_EMPTY");
    }

    return {
      token: name,
      model: geminiConfig.liveModel,
      apiVersion: geminiConfig.liveApiVersion,
      expiresAt,
      demo: false,
      voice: geminiConfig.outputVoice,
    };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    logger.error("Live token creation failed", { message: err instanceof Error ? err.message : "unknown" });
    throw new HttpError(502, humanizeGeminiError(err), "LIVE_TOKEN_ERROR");
  }
}
