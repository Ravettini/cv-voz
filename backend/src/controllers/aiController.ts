import type { Request, Response } from "express";
import { createLiveEphemeralToken } from "../services/gemini/liveTokenService.js";

export async function liveToken(_req: Request, res: Response): Promise<void> {
  const token = await createLiveEphemeralToken();
  res.json(token);
}
