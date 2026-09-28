import type { NextFunction, Request, Response } from "express";

function restoreBrowserCache(req: Request): void {
  const body = req.body as { _cache?: unknown } | undefined;
  if (!body || typeof body !== "object" || !body._cache || typeof body._cache !== "object") return;
  const cache = body._cache as {
    interviews?: InterviewSession[];
    segmentsBySession?: Record<string, TranscriptSegment[]>;
    profiles?: Array<CandidateProfile & { interviewSessionId?: string }>;
    resumes?: ResumeWithContent[];
    photoUrl?: string;
  };
  delete body._cache;
  localDb.replaceFromBrowser(req.user.id, {
    interviews: cache.interviews ?? [],
    segmentsBySession: cache.segmentsBySession ?? {},
    profiles: cache.profiles ?? [],
    resumes: cache.resumes ?? [],
    photoUrl: cache.photoUrl,
  });
}
import { LOCAL_DEV_TOKEN, LOCAL_USER_EMAIL, LOCAL_USER_ID, localDb } from "../services/localStore.js";
import type { CandidateProfile, InterviewSession, ResumeWithContent, TranscriptSegment } from "@cv-voz/shared";
import { logger } from "../utils/logger.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({
        error: "Necesitás iniciar sesión para continuar.",
        code: "UNAUTHENTICATED",
      });
      return;
    }

    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      res.status(401).json({
        error: "Necesitás iniciar sesión para continuar.",
        code: "UNAUTHENTICATED",
      });
      return;
    }

    if (token !== LOCAL_DEV_TOKEN && token.length < 8) {
      res.status(401).json({
        error: "Tu sesión venció. Volvé a iniciar sesión.",
        code: "UNAUTHENTICATED",
      });
      return;
    }

    req.user = { id: LOCAL_USER_ID, email: LOCAL_USER_EMAIL };
    restoreBrowserCache(req);
    next();
  } catch (err) {
    logger.error("Auth middleware failed", { message: err instanceof Error ? err.message : "unknown" });
    res.status(401).json({
      error: "No pudimos validar tu sesión.",
      code: "UNAUTHENTICATED",
    });
  }
}
