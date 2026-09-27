import type { AtsScore, Resume, ResumeContent, ResumeWithContent, TemplateId } from "@cv-voz/shared";
import { HttpError } from "../middleware/errorHandler.js";
import { localDb } from "./localStore.js";

const generating = new Set<string>();

export function withGenerateLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  if (generating.has(userId)) {
    return Promise.reject(new HttpError(409, "Ya estamos creando tu CV. Esperá un momento.", "IN_PROGRESS"));
  }
  generating.add(userId);
  return fn().finally(() => generating.delete(userId));
}

export async function listResumes(userId: string): Promise<Resume[]> {
  return localDb.listResumes(userId);
}

export async function getResume(userId: string, id: string): Promise<Resume> {
  const resume = localDb.getResume(userId, id);
  if (!resume) throw new HttpError(404, "No encontramos ese CV.", "NOT_FOUND");
  return resume;
}

export async function getResumeWithContent(userId: string, id: string): Promise<ResumeWithContent> {
  const resume = localDb.getResumeWithContent(userId, id);
  if (!resume) throw new HttpError(404, "Ese CV todavía no tiene contenido generado.", "NOT_FOUND");
  return resume;
}

export async function createResume(params: {
  userId: string;
  candidateProfileId: string;
  name: string;
  targetRole?: string;
  templateId: TemplateId;
  photoUrl?: string;
}): Promise<Resume> {
  return localDb.createResume(params);
}

export async function saveResumeVersion(params: {
  userId: string;
  resumeId: string;
  content: ResumeContent;
  atsScore: AtsScore;
  templateId?: TemplateId;
  photoUrl?: string;
  name?: string;
  targetRole?: string;
}): Promise<ResumeWithContent> {
  const saved = localDb.saveResumeVersion(params);
  if (!saved) throw new HttpError(404, "No encontramos ese CV.", "NOT_FOUND");
  return saved;
}

export async function updateResumeTemplate(userId: string, id: string, templateId: TemplateId): Promise<Resume> {
  const resume = localDb.updateResumeTemplate(userId, id, templateId);
  if (!resume) throw new HttpError(404, "No encontramos ese CV.", "NOT_FOUND");
  return resume;
}

export async function duplicateResume(userId: string, id: string): Promise<Resume> {
  const current = await getResumeWithContent(userId, id);
  const copy = await createResume({
    userId,
    candidateProfileId: current.candidateProfileId,
    name: `${current.name} (copia)`,
    targetRole: current.targetRole,
    templateId: current.templateId,
    photoUrl: current.photoUrl,
  });
  await saveResumeVersion({
    userId,
    resumeId: copy.id,
    content: current.content,
    atsScore: current.atsScore,
    templateId: current.templateId,
    photoUrl: current.photoUrl,
    name: copy.name,
    targetRole: current.targetRole,
  });
  return getResume(userId, copy.id);
}

export async function deleteResume(userId: string, id: string): Promise<void> {
  if (!localDb.deleteResume(userId, id)) throw new HttpError(404, "No encontramos ese CV.", "NOT_FOUND");
}
