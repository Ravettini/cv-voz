import type { InterviewSession, InterviewStatus, TranscriptRole, TranscriptSegment } from "@cv-voz/shared";
import { HttpError } from "../middleware/errorHandler.js";
import { localDb } from "./localStore.js";

export async function createInterview(userId: string): Promise<InterviewSession> {
  return localDb.createInterview(userId);
}

export async function getInterview(userId: string, id: string): Promise<InterviewSession> {
  return localDb.ensureInterview(userId, id);
}

export async function updateInterviewStatus(
  userId: string,
  id: string,
  status: InterviewStatus,
  extra: Record<string, unknown> = {},
): Promise<InterviewSession> {
  localDb.ensureInterview(userId, id);
  const session = localDb.updateInterview(userId, id, status, {
    completedAt: extra.completed_at ? String(extra.completed_at) : undefined,
  });
  if (!session) throw new HttpError(404, "No encontramos esa entrevista.", "NOT_FOUND");
  return session;
}

export async function listSegments(sessionId: string): Promise<TranscriptSegment[]> {
  return localDb.listSegments(sessionId);
}

export async function appendSegment(params: {
  userId: string;
  sessionId: string;
  role: TranscriptRole;
  text: string;
}): Promise<TranscriptSegment> {
  const text = params.text.trim();
  if (!text) throw new HttpError(400, "El mensaje está vacío.", "EMPTY_TEXT");
  return localDb.appendSegment({ ...params, text });
}

export async function appendSegments(params: {
  userId: string;
  sessionId: string;
  items: Array<{ role: TranscriptRole; text: string; clientId?: string }>;
}): Promise<TranscriptSegment[]> {
  const saved: TranscriptSegment[] = [];
  for (const item of params.items) {
    if (!item.text.trim()) continue;
    saved.push(
      await appendSegment({
        userId: params.userId,
        sessionId: params.sessionId,
        role: item.role,
        text: item.text,
      }),
    );
  }
  return saved;
}
