import { Router } from "express";
import * as interview from "../controllers/interviewController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { aiLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const interviewsRouter = Router();
interviewsRouter.use(requireAuth);
interviewsRouter.post("/", asyncHandler(interview.create));
interviewsRouter.get("/:id", asyncHandler(interview.get));
interviewsRouter.post("/:id/segments", asyncHandler(interview.addSegments));
interviewsRouter.post("/:id/chat", aiLimiter, asyncHandler(interview.chat));
interviewsRouter.post("/:id/pause", asyncHandler(interview.pause));
interviewsRouter.post("/:id/resume", asyncHandler(interview.resume));
interviewsRouter.post("/:id/cancel", asyncHandler(interview.cancel));
interviewsRouter.post("/:id/finalize", aiLimiter, asyncHandler(interview.finalize));
