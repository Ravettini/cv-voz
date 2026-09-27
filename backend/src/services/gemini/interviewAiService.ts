import { INTERVIEWER_OPENING, INTERVIEWER_SYSTEM_PROMPT } from "../../prompts/interviewerSystemPrompt.js";
import { env, isDemoMode } from "../../config/env.js";
import type { TranscriptSegment } from "@cv-voz/shared";
import { generateText } from "./geminiService.js";

const DEMO_REPLIES = [
  "Gracias. Contame un poco en qué estuviste trabajando últimamente, aunque no esté todo ordenado.",
  "¿En qué empresa era y qué hacías día a día?",
  "Ahora contame qué estudiaste. Puede ser una carrera terminada, algo que estés estudiando actualmente o incluso algo que hayas empezado y no terminado.",
  "¿Hiciste cursos, capacitaciones o certificaciones que puedan ser útiles para el trabajo que estás buscando?",
  "Hasta ahora mencionaste algunas herramientas. ¿Hay alguna otra que quieras agregar?",
  "¿Hablás algún idioma además del que estamos usando ahora?",
  "Si tenés LinkedIn, portfolio o GitHub y querés incluirlos, podés decírmelos. Si no, no hay problema.",
  "Creo que ya tengo suficiente para armar un buen CV. Te hago una síntesis breve y, si está bien, podemos cerrar la entrevista.",
];

export async function replyAsInterviewer(params: {
  segments: Pick<TranscriptSegment, "role" | "text">[];
  userMessage: string;
}): Promise<string> {
  if (isDemoMode() && !env.GEMINI_API_KEY) {
    const userTurns = params.segments.filter((s) => s.role === "user").length;
    return DEMO_REPLIES[Math.min(userTurns, DEMO_REPLIES.length - 1)] ?? DEMO_REPLIES[0];
  }

  const history = params.segments
    .filter((s) => s.text.trim())
    .map((s) => ({
      role: s.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: s.text }],
    }));

  history.push({ role: "user", parts: [{ text: params.userMessage }] });

  return generateText({
    systemInstruction: INTERVIEWER_SYSTEM_PROMPT,
    contents: history.length > 0 ? history : [{ role: "user", parts: [{ text: params.userMessage }] }],
    temperature: 0.6,
  });
}

export function openingMessage(): string {
  return INTERVIEWER_OPENING;
}
