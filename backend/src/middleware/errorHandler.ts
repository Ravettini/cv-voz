import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../utils/logger.js";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function humanizeGeminiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  if (lower.includes("quota") || lower.includes("resource_exhausted") || lower.includes("429")) {
    return "El asistente está ocupado en este momento. Probá de nuevo en unos minutos.";
  }
  if (lower.includes("timeout") || lower.includes("deadline")) {
    return "La respuesta tardó más de lo esperado. Podés reintentar.";
  }
  if (lower.includes("websocket") || lower.includes("1011") || lower.includes("bidi")) {
    return "Se interrumpió la conexión con el asistente. Podés continuar desde donde estabas.";
  }
  if (lower.includes("api key") || lower.includes("api_key") || lower.includes("unauthenticated")) {
    return "Gemini no está configurado.";
  }
  if (lower.includes("json") || lower.includes("parse")) {
    return "No pudimos organizar la información. Vamos a intentarlo de nuevo.";
  }
  return "Tuvimos un problema al hablar con el asistente. Podés reintentar.";
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Algunos datos no son válidos. Revisá la información e intentá de nuevo.",
      code: "VALIDATION_ERROR",
    });
    return;
  }
  logger.error("Unhandled error", { message: err instanceof Error ? err.message : "unknown" });
  res.status(500).json({
    error: "Algo no salió como esperábamos. Probá de nuevo.",
    code: "INTERNAL_ERROR",
  });
}
