import { GoogleGenAI } from "@google/genai";
import { geminiConfig } from "../../config/geminiConfig.js";
import { env, isDemoMode, isGeminiConfigured } from "../../config/env.js";
import { HttpError, humanizeGeminiError } from "../../middleware/errorHandler.js";
import { logger } from "../../utils/logger.js";

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!env.GEMINI_API_KEY) {
    throw new HttpError(503, "Gemini no está configurado.", "GEMINI_NOT_CONFIGURED");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return client;
}

export function assertGeminiAvailable(): void {
  if (!isGeminiConfigured()) {
    throw new HttpError(503, "Gemini no está configurado.", "GEMINI_NOT_CONFIGURED");
  }
}

export async function generateText(params: {
  systemInstruction: string;
  contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>;
  temperature?: number;
}): Promise<string> {
  assertGeminiAvailable();
  if (isDemoMode() && !env.GEMINI_API_KEY) {
    throw new Error("DEMO_TEXT_FALLBACK");
  }

  try {
    const response = await getGeminiClient().models.generateContent({
      model: geminiConfig.textModel,
      contents: params.contents,
      config: {
        systemInstruction: params.systemInstruction,
        temperature: params.temperature ?? 0.4,
      },
    });
    const text = response.text?.trim();
    if (!text) {
      throw new HttpError(502, "El asistente no devolvió una respuesta. Probá de nuevo.", "EMPTY_RESPONSE");
    }
    return text;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    logger.error("Gemini generateText failed", { message: err instanceof Error ? err.message : "unknown" });
    throw new HttpError(502, humanizeGeminiError(err), "GEMINI_ERROR");
  }
}

export async function generateJson<T>(params: {
  systemInstruction: string;
  userPrompt: string;
  jsonSchema: Record<string, unknown>;
  temperature?: number;
}): Promise<unknown> {
  assertGeminiAvailable();
  if (isDemoMode() && !env.GEMINI_API_KEY) {
    throw new Error("DEMO_JSON_FALLBACK");
  }

  try {
    const response = await getGeminiClient().models.generateContent({
      model: geminiConfig.textModel,
      contents: params.userPrompt,
      config: {
        systemInstruction: params.systemInstruction,
        temperature: params.temperature ?? 0.2,
        responseMimeType: "application/json",
        responseJsonSchema: params.jsonSchema,
      },
    });
    const text = response.text?.trim();
    if (!text) {
      throw new HttpError(502, "No pudimos organizar la información. Vamos a intentarlo de nuevo.", "EMPTY_RESPONSE");
    }
    return JSON.parse(text) as T;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof SyntaxError) {
      throw new HttpError(502, "No pudimos organizar la información. Vamos a intentarlo de nuevo.", "INVALID_JSON");
    }
    logger.error("Gemini generateJson failed", { message: err instanceof Error ? err.message : "unknown" });
    throw new HttpError(502, humanizeGeminiError(err), "GEMINI_ERROR");
  }
}

export async function repairJson(params: {
  schemaDescription: string;
  invalidPayload: unknown;
  validationError: string;
}): Promise<unknown> {
  const prompt = `El JSON siguiente no cumple el esquema. Corregilo sin agregar hechos nuevos.
Error de validación: ${params.validationError}
Esquema esperado: ${params.schemaDescription}
JSON inválido:
${JSON.stringify(params.invalidPayload)}`;

  return generateJson({
    systemInstruction: "Reparás JSON inválido. No agregues datos factuales nuevos. Completá solo campos estructurales faltantes con valores vacíos o listas vacías.",
    userPrompt: prompt,
    jsonSchema: { type: "object" },
    temperature: 0,
  });
}
