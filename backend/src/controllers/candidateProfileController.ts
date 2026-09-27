import type { Request, Response } from "express";
import { CandidateProfileSchema } from "@cv-voz/shared";
import { getLatestCandidateProfile, updateCandidateProfile } from "../services/profileStore.js";
import { HttpError } from "../middleware/errorHandler.js";

export async function getProfile(req: Request, res: Response): Promise<void> {
  const profile = await getLatestCandidateProfile(req.user.id);
  if (!profile) throw new HttpError(404, "Todavía no hay información para revisar.", "NOT_FOUND");
  res.json({ profile });
}

export async function putProfile(req: Request, res: Response): Promise<void> {
  const parsed = CandidateProfileSchema.parse(req.body.profile ?? req.body);
  const profile = await updateCandidateProfile(req.user.id, parsed);
  res.json({ profile });
}
