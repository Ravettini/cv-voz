import { Router } from "express";
import { liveToken } from "../controllers/aiController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { aiLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const aiRouter = Router();
aiRouter.post("/live-token", requireAuth, aiLimiter, asyncHandler(liveToken));
