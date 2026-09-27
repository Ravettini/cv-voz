import { Router } from "express";
import type { CandidateProfile, InterviewSession, ResumeWithContent, TranscriptSegment } from "@cv-voz/shared";
import { seedDemoResume } from "../services/demoSeed.js";
import { localDb } from "../services/localStore.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const devRouter = Router();

devRouter.post(
  "/hydrate",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = req.body as {
      interviews?: InterviewSession[];
      segmentsBySession?: Record<string, TranscriptSegment[]>;
      profiles?: Array<CandidateProfile & { interviewSessionId?: string }>;
      resumes?: ResumeWithContent[];
      photoUrl?: string;
    };
    localDb.replaceFromBrowser(req.user.id, {
      interviews: body.interviews ?? [],
      segmentsBySession: body.segmentsBySession ?? {},
      profiles: body.profiles ?? [],
      resumes: body.resumes ?? [],
      photoUrl: body.photoUrl,
    });
    res.json({ ok: true });
  }),
);

devRouter.post(
  "/seed-demo",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const result = await seedDemoResume();
    res.status(201).json({
      ok: true,
      resumeId: result.resume.id,
      previewPath: `/resume/${result.resume.id}`,
      resume: result.resume,
      profile: result.profile,
    });
  }),
);
