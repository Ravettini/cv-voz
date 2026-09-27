import { randomUUID } from "node:crypto";
import {
  CandidateProfileSchema,
  GeminiCandidateProfileSchema,
  type CandidateProfile,
  type TranscriptSegment,
} from "@cv-voz/shared";
import { ZodError } from "zod";
import { env, isDemoMode } from "../../config/env.js";
import { EXTRACTION_SYSTEM_PROMPT } from "../../prompts/extractionSystemPrompt.js";
import { logger } from "../../utils/logger.js";
import { generateJson, repairJson } from "./geminiService.js";
import { candidateProfileJsonSchema } from "./jsonSchemas.js";

function demoProfile(id: string): CandidateProfile {
  return {
    id,
    personal: {
      fullName: "Alex Gómez",
      city: "Buenos Aires",
      country: "Argentina",
      email: undefined,
      phone: undefined,
    },
    target: {
      desiredRole: "Analista de datos",
      industry: "Servicios",
      seniority: "Junior",
      jobType: "Full time",
    },
    professionalSummary: undefined,
    experiences: [
      {
        id: "exp-1",
        company: "Comercio familiar",
        role: "Atención y administración",
        startDate: "2022",
        endDate: undefined,
        current: true,
        responsibilities: ["Armado de planillas para control de entregas pendientes", "Atención al cliente"],
        achievements: [],
        tools: ["Excel"],
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Universidad",
        field: "Administración",
        degree: undefined,
        status: "in_progress",
        startDate: "2021",
      },
    ],
    courses: [],
    certifications: [],
    skills: [
      { id: "skill-1", name: "Excel" },
      { id: "skill-2", name: "Atención al cliente" },
    ],
    languages: [{ id: "lang-1", language: "Español", level: "nativo" }],
    links: [],
    missingInformation: ["Correo electrónico de contacto", "Fechas más precisas de la experiencia actual"],
    warnings: ["Perfil de demostración. Activá GEMINI_API_KEY para extraer desde una entrevista real."],
  };
}

function ensureIds(profile: CandidateProfile): CandidateProfile {
  const withId = (prefix: string, id?: string) => id || `${prefix}-${randomUUID().slice(0, 8)}`;
  return {
    ...profile,
    experiences: profile.experiences.map((item, i) => ({ ...item, id: withId(`exp-${i}`, item.id) })),
    education: profile.education.map((item, i) => ({ ...item, id: withId(`edu-${i}`, item.id) })),
    courses: profile.courses.map((item, i) => ({ ...item, id: withId(`course-${i}`, item.id) })),
    certifications: profile.certifications.map((item, i) => ({ ...item, id: withId(`cert-${i}`, item.id) })),
    skills: profile.skills.map((item, i) => ({ ...item, id: withId(`skill-${i}`, item.id) })),
    languages: profile.languages.map((item, i) => ({ ...item, id: withId(`lang-${i}`, item.id) })),
    links: profile.links.map((item, i) => ({ ...item, id: withId(`link-${i}`, item.id) })),
  };
}

const COLLOQUIAL_DATE = /\b(un año y medio|dos años|hace poco|hace un tiempo|tipo \d+|más o menos)\b/i;

const URL_RE =
  /(?:https?:\/\/[^\s,;]+)|(?:(?:www\.)?(?:linkedin|github|gitlab|behance|dribbble)\.com\/[^\s,;]+)/gi;

function guessLinkLabel(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("linkedin.com")) return "LinkedIn";
  if (u.includes("github.com")) return "GitHub";
  if (u.includes("gitlab.com")) return "GitLab";
  if (u.includes("behance.net")) return "Behance";
  if (u.includes("dribbble.com")) return "Dribbble";
  return "Portfolio";
}

function normalizeUrl(raw: string): string {
  const cleaned = raw.replace(/[),.;:]+$/g, "");
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://${cleaned}`;
}

function harvestLinksFromTranscript(
  segments: Pick<TranscriptSegment, "role" | "text">[],
  existing: CandidateProfile["links"],
): CandidateProfile["links"] {
  const byUrl = new Map(existing.map((l) => [l.url.replace(/\/$/, "").toLowerCase(), l]));

  for (const seg of segments) {
    if (seg.role !== "user") continue;
    const matches = seg.text.match(URL_RE) ?? [];
    for (const match of matches) {
      const url = normalizeUrl(match);
      const key = url.replace(/\/$/, "").toLowerCase();
      if (byUrl.has(key)) continue;
      if (url.includes("@")) continue;
      byUrl.set(key, {
        id: `link-harvest-${byUrl.size + 1}`,
        label: guessLinkLabel(url),
        url,
      });
    }
  }

  return [...byUrl.values()];
}

function cleanStringList(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items.map((x) => String(x ?? "").trim()).filter(Boolean);
}

/** Normaliza salida cruda de Gemini antes de Zod. */
function sanitizeRawProfile(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const r = raw as Record<string, unknown>;
  const personal = (r.personal && typeof r.personal === "object" ? r.personal : {}) as Record<string, unknown>;
  const experiences = Array.isArray(r.experiences) ? r.experiences : [];
  const education = Array.isArray(r.education) ? r.education : [];
  const courses = Array.isArray(r.courses) ? r.courses : [];
  const certifications = Array.isArray(r.certifications) ? r.certifications : [];
  const skills = Array.isArray(r.skills) ? r.skills : [];
  const languages = Array.isArray(r.languages) ? r.languages : [];
  const links = Array.isArray(r.links) ? r.links : [];

  return {
    ...r,
    personal: {
      ...personal,
      fullName: String(personal.fullName ?? "").trim() || "Candidato",
    },
    target: r.target && typeof r.target === "object" ? r.target : {},
    experiences: experiences
      .filter((e) => e && typeof e === "object")
      .map((e) => {
        const exp = e as Record<string, unknown>;
        return {
          ...exp,
          company: String(exp.company ?? "").trim() || "Empresa",
          role: String(exp.role ?? "").trim() || "Rol",
          current: Boolean(exp.current),
          responsibilities: cleanStringList(exp.responsibilities),
          achievements: cleanStringList(exp.achievements),
          tools: cleanStringList(exp.tools),
        };
      }),
    education: education
      .filter((e) => e && typeof e === "object")
      .map((e) => {
        const edu = e as Record<string, unknown>;
        return {
          ...edu,
          institution: String(edu.institution ?? "").trim() || "Institución",
        };
      }),
    courses: courses.filter((c) => c && typeof c === "object" && String((c as { name?: string }).name ?? "").trim()),
    certifications: certifications.filter(
      (c) => c && typeof c === "object" && String((c as { name?: string }).name ?? "").trim(),
    ),
    skills: skills
      .filter((s) => s && typeof s === "object")
      .map((s) => {
        const sk = s as Record<string, unknown>;
        return { ...sk, name: String(sk.name ?? "").trim() };
      })
      .filter((s) => s.name),
    languages: languages
      .filter((l) => l && typeof l === "object")
      .map((l) => {
        const lang = l as Record<string, unknown>;
        return { ...lang, language: String(lang.language ?? "").trim() || "Idioma" };
      }),
    links: links
      .filter((l) => l && typeof l === "object")
      .map((l) => {
        const link = l as Record<string, unknown>;
        const url = String(link.url ?? "").trim();
        return {
          ...link,
          label: String(link.label ?? "").trim() || guessLinkLabel(url),
          url,
        };
      })
      .filter((l) => l.url),
    missingInformation: cleanStringList(r.missingInformation),
    warnings: cleanStringList(r.warnings),
  };
}

function postProcessProfile(profile: CandidateProfile): CandidateProfile {
  const missing = new Set(profile.missingInformation);

  if (!profile.personal.email) missing.add("Email de contacto");
  if (!profile.personal.city && !profile.personal.country) missing.add("Ciudad o país");
  if (!profile.personal.phone) missing.add("Teléfono de contacto (opcional)");

  const experiences = profile.experiences.map((exp) => {
    const next = { ...exp };
    if (COLLOQUIAL_DATE.test(exp.startDate ?? "") || COLLOQUIAL_DATE.test(exp.endDate ?? "")) {
      missing.add(`Fecha más precisa para la experiencia en ${exp.company}`);
      if (COLLOQUIAL_DATE.test(exp.startDate ?? "")) next.startDate = undefined;
      if (COLLOQUIAL_DATE.test(exp.endDate ?? "")) next.endDate = undefined;
    }
    if (!exp.startDate) {
      missing.add(`Fecha de inicio en ${exp.company}`);
    }
    return next;
  });

  return {
    ...profile,
    experiences,
    missingInformation: [...missing],
  };
}

function formatZodError(err: unknown): string {
  if (err instanceof ZodError) {
    return err.issues
      .slice(0, 8)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
  }
  return err instanceof Error ? err.message : "invalid";
}

function validateProfile(raw: unknown, id: string): CandidateProfile {
  const sanitized = sanitizeRawProfile(raw);
  const gemini = GeminiCandidateProfileSchema.safeParse(sanitized);
  if (gemini.success) {
    const draft = {
      ...gemini.data,
      id,
      experiences: gemini.data.experiences.map((e) => ({
        ...e,
        id: e.id || `exp-tmp`,
        responsibilities: cleanStringList(e.responsibilities),
        achievements: cleanStringList(e.achievements),
        tools: cleanStringList(e.tools),
      })),
      education: gemini.data.education.map((e) => ({ ...e, id: e.id || `edu-tmp` })),
      courses: gemini.data.courses.map((c) => ({ ...c, id: c.id || `course-tmp` })),
      certifications: gemini.data.certifications.map((c) => ({ ...c, id: c.id || `cert-tmp` })),
      skills: gemini.data.skills.map((s) => ({ ...s, id: s.id || `skill-tmp` })),
      languages: gemini.data.languages.map((l) => ({ ...l, id: l.id || `lang-tmp` })),
      links: gemini.data.links.map((l) => ({ ...l, id: l.id || `link-tmp` })),
    };
    const withIds = ensureIds(draft as CandidateProfile);
    const again = CandidateProfileSchema.safeParse(withIds);
    if (again.success) return postProcessProfile(again.data);
    throw again.error;
  }

  const withId = typeof sanitized === "object" && sanitized ? { ...(sanitized as object), id } : { id };
  const parsed = CandidateProfileSchema.safeParse(withId);
  if (parsed.success) return postProcessProfile(ensureIds(parsed.data));
  throw gemini.error ?? parsed.error;
}

function fallbackProfileFromTranscript(
  id: string,
  segments: Pick<TranscriptSegment, "role" | "text">[],
): CandidateProfile {
  const userText = segments
    .filter((s) => s.role === "user")
    .map((s) => s.text)
    .join(" ");
  const emailMatch = userText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const nameGuess =
    userText
      .split(/[.!\n]/)[0]
      ?.replace(/hola[, ]*/i, "")
      .trim()
      .slice(0, 80) || "Candidato";

  return postProcessProfile(
    ensureIds({
      id,
      personal: {
        fullName: nameGuess.length > 2 ? nameGuess : "Candidato",
        email: emailMatch?.[0],
      },
      target: {},
      experiences: [],
      education: [],
      courses: [],
      certifications: [],
      skills: [],
      languages: [],
      links: harvestLinksFromTranscript(segments, []),
      missingInformation: ["Revisá y completá los datos: la extracción automática fue parcial"],
      warnings: ["Perfil parcial generado tras un error de organización. Editá en la revisión."],
    }),
  );
}

export async function extractCandidateProfile(params: {
  profileId: string;
  segments: Pick<TranscriptSegment, "role" | "text">[];
}): Promise<CandidateProfile> {
  if (isDemoMode() && !env.GEMINI_API_KEY) {
    return demoProfile(params.profileId);
  }

  const transcript = params.segments
    .map((s) => `${s.role === "user" ? "Candidato" : "Asistente"}: ${s.text}`)
    .join("\n");

  const userPrompt = `Extraé el perfil profesional SOLO a partir de esta entrevista. No inventes nada.
Incluí TODO lo que el candidato haya dicho: contacto, TODAS las experiencias laborales mencionadas (no solo la última), educación, cursos, skills, idiomas y links.

Prioridades:
1) Contacto: fullName, city/country, email, phone si aparecen.
2) Links: cada URL o perfil mencionado va en links[] con label + url completa. No omitas ninguno.
3) Experiencias: una entrada por cada trabajo mencionado, con startDate/endDate normalizados a año o mes/año (NO "un año y medio").
4) Si faltan email, ciudad o fechas de experiencia, listalos en missingInformation.
5) Redactá responsibilities/achievements en estilo CV sin agregar hechos.
6) level de idiomas SOLO: basico | intermedio | avanzado | bilingue | nativo (sin tildes).
7) ids opcionales (exp-1, skill-1…). Si no los generás, está bien.

ENTREVISTA:
${transcript}`;

  let raw: unknown;
  try {
    raw = await generateJson({
      systemInstruction: EXTRACTION_SYSTEM_PROMPT,
      userPrompt,
      jsonSchema: candidateProfileJsonSchema,
      temperature: 0.1,
    });
  } catch (err) {
    logger.warn("Candidate extraction generateJson failed, retrying", {
      message: err instanceof Error ? err.message : "unknown",
    });
    try {
      raw = await generateJson({
        systemInstruction: EXTRACTION_SYSTEM_PROMPT,
        userPrompt,
        jsonSchema: candidateProfileJsonSchema,
        temperature: 0,
      });
    } catch (err2) {
      logger.error("Candidate extraction failed twice, using fallback profile", {
        message: err2 instanceof Error ? err2.message : "unknown",
      });
      return fallbackProfileFromTranscript(params.profileId, params.segments);
    }
  }

  try {
    const profile = validateProfile(raw, params.profileId);
    return {
      ...profile,
      links: harvestLinksFromTranscript(params.segments, profile.links),
    };
  } catch (firstError) {
    logger.warn("Candidate profile validation failed, attempting repair", {
      issues: formatZodError(firstError),
    });
    try {
      const repaired = await repairJson({
        schemaDescription:
          "CandidateProfile with personal, target, experiences, education, courses, certifications, skills, languages, links, missingInformation, warnings. language.level must be basico|intermedio|avanzado|bilingue|nativo. ids optional.",
        invalidPayload: sanitizeRawProfile(raw),
        validationError: formatZodError(firstError),
      });
      const profile = validateProfile(repaired, params.profileId);
      return {
        ...profile,
        links: harvestLinksFromTranscript(params.segments, profile.links),
      };
    } catch (repairError) {
      logger.error("Candidate profile repair failed, using fallback", {
        issues: formatZodError(repairError),
      });
      // No bloquear al usuario: devolver perfil parcial editable
      try {
        const soft = GeminiCandidateProfileSchema.safeParse(sanitizeRawProfile(raw));
        if (soft.success) {
          const profile = validateProfile(soft.data, params.profileId);
          return {
            ...profile,
            links: harvestLinksFromTranscript(params.segments, profile.links),
            warnings: [
              ...profile.warnings,
              "Algunos datos se normalizaron automáticamente; revisalos con cuidado.",
            ],
          };
        }
      } catch {
        /* fall through */
      }
      return fallbackProfileFromTranscript(params.profileId, params.segments);
    }
  }
}
