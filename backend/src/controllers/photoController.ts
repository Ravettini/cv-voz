import type { Request, Response } from "express";
import { deleteProfilePhoto, saveProfilePhoto } from "../services/storage/photoStorage.js";
import { getProfilePhotoUrl } from "../services/profileStore.js";
import { HttpError } from "../middleware/errorHandler.js";

export async function uploadPhoto(req: Request, res: Response): Promise<void> {
  if (!req.file?.buffer) {
    throw new HttpError(400, "Elegí una imagen para continuar.", "NO_FILE");
  }
  const url = await saveProfilePhoto(req.user.id, req.file.buffer);
  res.json({ photoUrl: url });
}

export async function removePhoto(req: Request, res: Response): Promise<void> {
  await deleteProfilePhoto(req.user.id);
  res.json({ ok: true });
}

export async function getPhoto(req: Request, res: Response): Promise<void> {
  const photoUrl = await getProfilePhotoUrl(req.user.id);
  res.json({ photoUrl });
}
