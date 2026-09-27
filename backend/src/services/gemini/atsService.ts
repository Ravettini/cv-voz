import { ResumeContentSchema, type CandidateProfile, type Experience, type ResumeContent } from "@cv-voz/shared";
import { env, isDemoMode } from "../../config/env.js";
import { ATS_SYSTEM_PROMPT } from "../../prompts/atsSystemPrompt.js";
import { logger } from "../../utils/logger.js";
import { generateJson, repairJson } from "./geminiService.js";
import { resumeContentJsonSchema } from "./jsonSchemas.js";

function period(start?: string, end?: string, current?: boolean): string {
  if (!start && !end && !current) return "";
  if (current) return [start, "Actualidad"].filter(Boolean).join(" — ");
  return [start, end].filter(Boolean).join(" — ");
}

/** Expande bullets cortos usando solo hechos/herramientas ya presentes. No inventa métricas. */
function expandBullets(exp: Experience, maxBullets = 4, maxWords = 22): string[] {
  const tools = exp.tools.filter(Boolean);
  const toolSuffix = tools.length ? ` con ${tools.slice(0, 2).join(", ")}` : "";
  const raw = [...exp.achievements, ...exp.responsibilities].filter((b) => b.trim());

  const bullets = raw.map((bullet) => {
    let text = bullet.trim().replace(/\.$/, "");
    const words = text.split(/\s+/);
    if (words.length > maxWords) {
      text = words.slice(0, maxWords).join(" ");
    } else if (words.length < 10 && toolSuffix && !tools.some((t) => text.toLowerCase().includes(t.toLowerCase()))) {
      text = `${text}${toolSuffix}`;
    }
    return `${text}.`;
  });

  if (!bullets.length && tools.length) {
    bullets.push(`Trabajo con ${tools.slice(0, 3).join(", ")} como ${exp.role}.`);
  }

  return bullets.slice(0, maxBullets);
}

function onePageBudget(experienceCount: number): { maxBullets: number; maxWords: number; summaryMaxChars: number } {
  if (experienceCount <= 2) return { maxBullets: 5, maxWords: 24, summaryMaxChars: 520 };
  if (experienceCount <= 4) return { maxBullets: 3, maxWords: 20, summaryMaxChars: 420 };
  return { maxBullets: 2, maxWords: 18, summaryMaxChars: 360 };
}

function trimSummary(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  const cut = t.slice(0, maxChars);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  return (lastStop > maxChars * 0.5 ? cut.slice(0, lastStop + 1) : `${cut.replace(/\s+\S*$/, "")}.`).trim();
}

/** Condensa redacción para priorizar 1 página A4 sin omitir secciones/hechos del perfil. */
function densifyForOnePage(content: ResumeContent, profile: CandidateProfile): ResumeContent {
  const budget = onePageBudget(profile.experiences.length);
  return {
    ...content,
    professionalSummary: trimSummary(content.professionalSummary, budget.summaryMaxChars),
    experiences: content.experiences.map((exp, idx) => {
      const source = profile.experiences[idx];
      let bullets = exp.bullets.map((b) => {
        const words = b.trim().replace(/\.$/, "").split(/\s+/);
        if (words.length <= budget.maxWords) return b.trim().endsWith(".") ? b.trim() : `${b.trim()}.`;
        return `${words.slice(0, budget.maxWords).join(" ")}.`;
      });
      if (bullets.length > budget.maxBullets) {
        bullets = bullets.slice(0, budget.maxBullets);
      }
      if (source && bullets.length === 0) {
        bullets = expandBullets(source, budget.maxBullets, budget.maxWords);
      }
      return { ...exp, bullets };
    }),
  };
}

function humanMissing(list: string[]): string[] {
  return list
    .map((item) => item.trim())
    .filter((item) => item && !/^[a-z0-9_.]+$/i.test(item) && !/\.(photoUrl|detail|email)$/i.test(item));
}

export function profileToResumeFallback(profile: CandidateProfile, photoUrl?: string): ResumeContent {
  const budget = onePageBudget(profile.experiences.length);
  const summary =
    profile.professionalSummary?.trim() ||
    [profile.target.desiredRole, profile.experiences[0]?.role, profile.skills.slice(0, 4).map((s) => s.name).join(", ")]
      .filter(Boolean)
      .join(". ") ||
    "Profesional en búsqueda de nuevas oportunidades.";

  const content: ResumeContent = {
    personal: {
      fullName: profile.personal.fullName || "Candidato",
      city: profile.personal.city,
      country: profile.personal.country,
      email: profile.personal.email,
      phone: profile.personal.phone,
      photoUrl,
    },
    targetRole: profile.target.desiredRole,
    professionalSummary: summary,
    experiences: profile.experiences.map((exp) => ({
      company: exp.company,
      role: exp.role,
      period: period(exp.startDate, exp.endDate, exp.current),
      bullets: expandBullets(exp, budget.maxBullets, budget.maxWords),
    })),
    education: profile.education.map((edu) => ({
      institution: edu.institution,
      title: [edu.degree, edu.field].filter(Boolean).join(" · ") || edu.institution,
      period: period(edu.startDate, edu.endDate ?? edu.estimatedEndDate, edu.status === "in_progress"),
      detail: edu.status === "in_progress" ? "En curso" : edu.status === "incomplete" ? "Incompleto" : undefined,
    })),
    courses: profile.courses.map((c) => ({ name: c.name, institution: c.institution, date: c.date })),
    certifications: profile.certifications.map((c) => ({ name: c.name, institution: c.institution, date: c.date })),
    skills: profile.skills.map((s) => s.name),
    languages: profile.languages.map((l) => ({ language: l.language, level: l.level })),
    links: profile.links.map((l) => ({ label: l.label, url: l.url })),
    missingInformation: humanMissing(profile.missingInformation),
    warnings: profile.warnings,
  };

  return densifyForOnePage(content, profile);
}

function assertNoInventedCompanies(profile: CandidateProfile, content: ResumeContent): void {
  const known = new Set(profile.experiences.map((e) => e.company.trim().toLowerCase()));
  for (const exp of content.experiences) {
    if (!known.has(exp.company.trim().toLowerCase())) {
      throw new Error(`Invented company: ${exp.company}`);
    }
  }
}

/** Preferí arrays no vacíos del perfil confirmado: Gemini no puede omitir hechos del usuario. */
function preferUserFacts<T>(fromModel: T[] | undefined, fromProfile: T[]): T[] {
  if (fromProfile.length) return fromProfile;
  return fromModel ?? [];
}

function preserveUserFacts(content: ResumeContent, fallback: ResumeContent, photoUrl?: string): ResumeContent {
  return {
    ...content,
    personal: {
      ...content.personal,
      fullName: fallback.personal.fullName || content.personal.fullName,
      email: fallback.personal.email || content.personal.email,
      phone: fallback.personal.phone || content.personal.phone,
      city: fallback.personal.city || content.personal.city,
      country: fallback.personal.country || content.personal.country,
      photoUrl: photoUrl ?? content.personal.photoUrl ?? fallback.personal.photoUrl,
    },
    targetRole: fallback.targetRole || content.targetRole,
    education: preferUserFacts(content.education, fallback.education),
    courses: preferUserFacts(content.courses, fallback.courses),
    certifications: preferUserFacts(content.certifications, fallback.certifications),
    skills: preferUserFacts(content.skills, fallback.skills),
    languages: preferUserFacts(content.languages, fallback.languages),
    links: preferUserFacts(content.links, fallback.links),
    missingInformation: humanMissing([...content.missingInformation, ...fallback.missingInformation]),
    warnings: [...new Set([...(content.warnings ?? []), ...(fallback.warnings ?? [])])],
  };
}

function mergeWithFallback(raw: unknown, fallback: ResumeContent, photoUrl?: string): ResumeContent | null {
  if (!raw || typeof raw !== "object") return null;
  const model = raw as Partial<ResumeContent>;
  const candidate = preserveUserFacts(
    {
      ...fallback,
      ...model,
      personal: {
        ...fallback.personal,
        ...(model.personal ?? {}),
        fullName: fallback.personal.fullName,
        email: fallback.personal.email || model.personal?.email,
        phone: fallback.personal.phone || model.personal?.phone,
        city: fallback.personal.city || model.personal?.city,
        country: fallback.personal.country || model.personal?.country,
        photoUrl,
      },
      professionalSummary: model.professionalSummary?.trim() || fallback.professionalSummary,
      experiences: model.experiences?.length ? model.experiences : fallback.experiences,
      education: preferUserFacts(model.education, fallback.education),
      courses: preferUserFacts(model.courses, fallback.courses),
      certifications: preferUserFacts(model.certifications, fallback.certifications),
      skills: preferUserFacts(model.skills, fallback.skills),
      languages: preferUserFacts(model.languages, fallback.languages),
      links: preferUserFacts(model.links, fallback.links),
      missingInformation: humanMissing([...(model.missingInformation ?? []), ...fallback.missingInformation]),
    },
    fallback,
    photoUrl,
  );
  const parsed = ResumeContentSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export async function optimizeResumeContent(params: {
  profile: CandidateProfile;
  targetRole?: string;
  photoUrl?: string;
}): Promise<ResumeContent> {
  const fallback = profileToResumeFallback(params.profile, params.photoUrl);

  if (isDemoMode() && !env.GEMINI_API_KEY) {
    return fallback;
  }

  const expCount = params.profile.experiences.length;
  const budget = onePageBudget(expCount);
  const userPrompt = `Optimizá la redacción de este perfil confirmado por el candidato.
Puesto objetivo: ${params.targetRole || params.profile.target.desiredRole || "no especificado"}
Cantidad de experiencias: ${expCount}

Reglas:
- Objetivo prioritario: CV de UNA sola página A4 (con ${expCount} experiencias esto es obligatorio salvo trayectoria excepcional).
- TODA información del JSON del perfil debe aparecer (contacto, links, skills, idiomas, cursos, educación, experiencias). Condensá la forma, no borres hechos.
- Incluí email, teléfono, ciudad/país y links si existen.
- Máximo ~${budget.maxBullets} bullets por experiencia; ~${budget.maxWords} palabras por bullet; resumen compacto (2–4 líneas).
- No expandas artificialmente ni rellenes. Claridad y densidad.
- No agregues empresas, fechas, herramientas, links ni métricas que no estén en el JSON.
- missingInformation solo con frases humanas, nunca nombres de campos técnicos.
- professionalSummary no vacío.

PERFIL CONFIRMADO:
${JSON.stringify(params.profile)}`;

  let raw: unknown;
  try {
    raw = await generateJson({
      systemInstruction: ATS_SYSTEM_PROMPT,
      userPrompt,
      jsonSchema: resumeContentJsonSchema,
      temperature: 0.35,
    });
  } catch (err) {
    logger.warn("ATS generation failed, using fallback", { message: err instanceof Error ? err.message : "unknown" });
    return fallback;
  }

  let merged = mergeWithFallback(raw, fallback, params.photoUrl);
  if (merged) {
    try {
      assertNoInventedCompanies(params.profile, merged);
      const experiences = merged.experiences.map((exp, idx) => {
        const source = params.profile.experiences[idx];
        const tooShort = exp.bullets.length > 0 && exp.bullets.every((b) => b.split(/\s+/).length < 8);
        if (source && tooShort) {
          return { ...exp, bullets: expandBullets(source, budget.maxBullets, budget.maxWords) };
        }
        return exp;
      });
      return densifyForOnePage(
        preserveUserFacts({ ...merged, experiences }, fallback, params.photoUrl),
        params.profile,
      );
    } catch {
      logger.warn("ATS output contained unknown companies; using fallback experiences");
      return densifyForOnePage(
        preserveUserFacts({ ...merged, experiences: fallback.experiences }, fallback, params.photoUrl),
        params.profile,
      );
    }
  }

  try {
    const repaired = await repairJson({
      schemaDescription: "ResumeContent with personal, professionalSummary, experiences, education, skills, languages",
      invalidPayload: raw,
      validationError: "schema mismatch",
    });
    merged = mergeWithFallback(repaired, fallback, params.photoUrl);
    if (merged) {
      return densifyForOnePage(
        preserveUserFacts({ ...merged, experiences: fallback.experiences }, fallback, params.photoUrl),
        params.profile,
      );
    }
  } catch (err) {
    logger.warn("ATS repair failed, using fallback", { message: err instanceof Error ? err.message : "unknown" });
  }

  return fallback;
}
