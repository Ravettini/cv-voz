import { Router } from "express";
import * as controller from "../controllers/candidateProfileController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const candidateProfileRouter = Router();
candidateProfileRouter.use(requireAuth);
candidateProfileRouter.get("/", asyncHandler(controller.getProfile));
candidateProfileRouter.put("/", asyncHandler(controller.putProfile));
