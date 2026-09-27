import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import { extractCandidateProfile } from "../services/gemini/candidateExtractionService.js";
import { openingMessage, replyAsInterviewer } from "../services/gemini/interviewAiService.js";
import {
  appendSegment,
  appendSegments,
  createInterview,
  getInterview,
  listSegments,
  updateInterviewStatus,
} from "../services/interviewStore.js";
import { saveCandidateProfile } from "../services/profileStore.js";
import { HttpError } from "../middleware/errorHandler.js";
import { paramId } from "../utils/params.js";

const SegmentSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().min(1).max(8000),
  clientId: z.string().optional(),
});

export async function create(req: Request, res: Response): Promise<void> {
  const session = await createInterview(req.user.id);
  const opening = openingMessage();
  const segment = await appendSegment({
    userId: req.user.id,
    sessionId: session.id,
    role: "assistant",
    text: opening,
  });
  res.status(201).json({ session, segments: [segment], opening });
}

export async function get(req: Request, res: Response): Promise<void> {
  const id = paramId(req);
  const session = await getInterview(req.user.id, id);
  const segments = await listSegments(session.id);
  res.json({ session, segments });
}

export async function addSegments(req: Request, res: Response): Promise<void> {
  const id = paramId(req);
  const session = await getInterview(req.user.id, id);
  if (session.status === "completed" || session.status === "cancelled") {
    throw new HttpError(409, "Esta entrevista ya está cerrada.", "CLOSED");
  }
  const parsed = z.object({ segments: z.array(SegmentSchema).min(1).max(20) }).parse(req.body);
  const saved = await appendSegments({
    userId: req.user.id,
    sessionId: session.id,
    items: parsed.segments,
  });
  res.status(201).json({ segments: saved });
}

export async function chat(req: Request, res: Response): Promise<void> {
  const id = paramId(req);
  const session = await getInterview(req.user.id, id);
  if (session.status === "completed" || session.status === "cancelled") {
    throw new HttpError(409, "Esta entrevista ya está cerrada.", "CLOSED");
  }
  const { text } = z.object({ text: z.string().trim().min(1).max(8000) }).parse(req.body);
  const history = await listSegments(session.id);
  const userSeg = await appendSegment({
    userId: req.user.id,
    sessionId: session.id,
    role: "user",
    text,
  });
  const reply = await replyAsInterviewer({ segments: history, userMessage: text });
  const assistantSeg = await appendSegment({
    userId: req.user.id,
    sessionId: session.id,
    role: "assistant",
    text: reply,
  });
  res.json({ user: userSeg, assistant: assistantSeg });
}

export async function pause(req: Request, res: Response): Promise<void> {
  const session = await updateInterviewStatus(req.user.id, paramId(req), "paused");
  res.json({ session });
}

export async function resume(req: Request, res: Response): Promise<void> {
  const session = await updateInterviewStatus(req.user.id, paramId(req), "active");
  res.json({ session });
}

export async function cancel(req: Request, res: Response): Promise<void> {
  const session = await updateInterviewStatus(req.user.id, paramId(req), "cancelled");
  res.json({ session });
}

export async function finalize(req: Request, res: Response): Promise<void> {
  const id = paramId(req);
  const session = await getInterview(req.user.id, id);
  const segments = await listSegments(session.id);
  const profile = await extractCandidateProfile({
    profileId: randomUUID(),
    segments,
  });
  const saved = await saveCandidateProfile({
    userId: req.user.id,
    interviewSessionId: session.id,
    profile,
  });
  const completed = await updateInterviewStatus(req.user.id, session.id, "completed", {
    completed_at: new Date().toISOString(),
  });
  res.json({ session: completed, profile: saved });
}
