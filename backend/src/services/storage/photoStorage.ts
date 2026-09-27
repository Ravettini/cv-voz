import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { ALLOWED_PHOTO_MIME, MAX_PHOTO_BYTES } from "@cv-voz/shared";
import { HttpError } from "../../middleware/errorHandler.js";
import { localDb } from "../localStore.js";

export async function saveProfilePhoto(userId: string, buffer: Buffer): Promise<string> {
  if (buffer.length > MAX_PHOTO_BYTES) {
    throw new HttpError(400, "La foto supera los 5 MB. Elegí una imagen más liviana.", "FILE_TOO_LARGE");
  }

  const detected = await fileTypeFromBuffer(buffer);
  const mime = detected?.mime;
  if (!mime || !ALLOWED_PHOTO_MIME.includes(mime as (typeof ALLOWED_PHOTO_MIME)[number])) {
    throw new HttpError(400, "Usá una imagen JPG, PNG o WEBP.", "INVALID_FILE_TYPE");
  }

  const optimized = await sharp(buffer)
    .rotate()
    .resize(800, 800, { fit: "cover" })
    .jpeg({ quality: 82 })
    .toBuffer();

  const dataUrl = `data:image/jpeg;base64,${optimized.toString("base64")}`;
  localDb.setPhoto(userId, dataUrl);
  return dataUrl;
}

export async function deleteProfilePhoto(userId: string): Promise<void> {
  localDb.deletePhoto(userId);
}
