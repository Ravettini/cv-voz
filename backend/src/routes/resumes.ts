import { Router } from "express";
import * as controller from "../controllers/resumeController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { generateLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const resumesRouter = Router();
resumesRouter.use(requireAuth);
resumesRouter.get("/", asyncHandler(controller.list));
resumesRouter.post("/", asyncHandler(controller.create));
resumesRouter.post("/export", asyncHandler(controller.exportFile));
resumesRouter.get("/:id", asyncHandler(controller.get));
resumesRouter.post("/:id/generate", generateLimiter, asyncHandler(controller.generate));
resumesRouter.post("/:id/template", asyncHandler(controller.changeTemplate));
resumesRouter.post("/:id/duplicate", asyncHandler(controller.duplicate));
resumesRouter.delete("/:id", asyncHandler(controller.remove));
resumesRouter.get("/:id/pdf", asyncHandler(controller.pdf));
resumesRouter.get("/:id/docx", asyncHandler(controller.docx));
