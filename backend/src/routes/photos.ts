import { Router } from "express";
import multer from "multer";
import * as controller from "../controllers/photoController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { MAX_PHOTO_BYTES } from "@cv-voz/shared";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
});

export const photosRouter = Router();
photosRouter.use(requireAuth);
photosRouter.get("/", asyncHandler(controller.getPhoto));
photosRouter.post("/", upload.single("photo"), asyncHandler(controller.uploadPhoto));
photosRouter.delete("/", asyncHandler(controller.removePhoto));
