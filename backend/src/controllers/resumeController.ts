import type { Request, Response } from "express";
import { ResumeContentSchema, TemplateIdSchema } from "@cv-voz/shared";
import { z } from "zod";
import { optimizeResumeContent } from "../services/gemini/atsService.js";
import { getCandidateProfileById, getLatestCandidateProfile, getProfilePhotoUrl } from "../services/profileStore.js";
import { renderResumeDocx } from "../services/resume/docxService.js";
import { renderResumePdf } from "../services/resume/pdfService.js";
import { scoreResume } from "../services/resume/scoreService.js";
import {
  createResume,
  deleteResume,
  duplicateResume,
  getResume,
  getResumeWithContent,
  listResumes,
  saveResumeVersion,
  updateResumeTemplate,
  withGenerateLock,
} from "../services/resumeStore.js";
import { HttpError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import { paramId } from "../utils/params.js";

export async function list(req: Request, res: Response): Promise<void> {
  const resumes = await listResumes(req.user.id);
  res.json({ resumes });
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = z
    .object({
      candidateProfileId: z.string().optional(),
      templateId: TemplateIdSchema.default("ats"),
      name: z.string().trim().max(120).optional(),
    })
    .parse(req.body ?? {});

  const profile = body.candidateProfileId
    ? await getCandidateProfileById(req.user.id, body.candidateProfileId)
    : await getLatestCandidateProfile(req.user.id);
  if (!profile) throw new HttpError(400, "Primero revisá tu información.", "NO_PROFILE");

  const photoUrl = await getProfilePhotoUrl(req.user.id);
  const resume = await createResume({
    userId: req.user.id,
    candidateProfileId: profile.id,
    name: body.name || profile.target.desiredRole || `CV de ${profile.personal.fullName}`,
    targetRole: profile.target.desiredRole,
    templateId: body.templateId,
    photoUrl,
  });
  res.status(201).json({ resume, profile });
}

export async function get(req: Request, res: Response): Promise<void> {
  const id = paramId(req);
  try {
    const resume = await getResumeWithContent(req.user.id, id);
    res.json({ resume });
  } catch {
    const resume = await getResume(req.user.id, id);
    res.json({ resume });
  }
}

export async function generate(req: Request, res: Response): Promise<void> {
  const resumeId = paramId(req);
  const body = z
    .object({
      templateId: TemplateIdSchema.optional(),
      regenerate: z.boolean().optional(),
    })
    .parse(req.body ?? {});

  const result = await withGenerateLock(req.user.id, async () => {
    const resume = await getResume(req.user.id, resumeId);
    if (resume.currentVersion > 0 && !body.regenerate) {
      return getResumeWithContent(req.user.id, resumeId);
    }
    const profile = await getCandidateProfileById(req.user.id, resume.candidateProfileId);
    const photoUrl = (await getProfilePhotoUrl(req.user.id)) ?? resume.photoUrl;
    const content = await optimizeResumeContent({
      profile,
      targetRole: resume.targetRole,
      photoUrl,
    });
    const atsScore = scoreResume(profile, content);
    return saveResumeVersion({
      userId: req.user.id,
      resumeId,
      content,
      atsScore,
      templateId: body.templateId ?? resume.templateId,
      photoUrl,
      targetRole: resume.targetRole,
    });
  });

  res.json({ resume: result });
}

export async function changeTemplate(req: Request, res: Response): Promise<void> {
  const { templateId } = z.object({ templateId: TemplateIdSchema }).parse(req.body);
  const resume = await updateResumeTemplate(req.user.id, paramId(req), templateId);
  const withContent = await getResumeWithContent(req.user.id, resume.id).catch(() => null);
  res.json({ resume: withContent ?? resume });
}

export async function duplicate(req: Request, res: Response): Promise<void> {
  const resume = await duplicateResume(req.user.id, paramId(req));
  res.status(201).json({ resume });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await deleteResume(req.user.id, paramId(req));
  res.json({ ok: true });
}

export async function exportFile(req: Request, res: Response): Promise<void> {
  const body = z
    .object({
      kind: z.enum(["pdf", "docx"]),
      templateId: TemplateIdSchema,
      name: z.string().trim().max(120).optional(),
      content: ResumeContentSchema,
    })
    .parse(req.body);

  logger.info("Exportando CV", { kind: body.kind, templateId: body.templateId });
  const buffer =
    body.kind === "pdf"
      ? await renderResumePdf(body.content, body.templateId)
      : await renderResumeDocx(body.content);
  logger.info("CV exportado", { kind: body.kind, bytes: buffer.length });
  const filename = `${body.name || "cv"}.${body.kind}`;
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader(
    "Content-Type",
    body.kind === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(buffer);
}

export async function pdf(req: Request, res: Response): Promise<void> {
  const resume = await getResumeWithContent(req.user.id, paramId(req));
  const buffer = await renderResumePdf(resume.content, resume.templateId);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(resume.name)}.pdf"`);
  res.send(buffer);
}

export async function docx(req: Request, res: Response): Promise<void> {
  const resume = await getResumeWithContent(req.user.id, paramId(req));
  const buffer = await renderResumeDocx(resume.content);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(resume.name)}.docx"`);
  res.send(buffer);
}
