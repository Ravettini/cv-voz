import type { Request, Response } from "express";
import { env, isDemoMode, isGeminiConfigured, isLocalMode } from "../config/env.js";

export function health(_req: Request, res: Response): void {
  res.json({
    ok: true,
    gemini: isGeminiConfigured(),
    demo: isDemoMode(),
    local: isLocalMode(),
    env: env.NODE_ENV,
  });
}
