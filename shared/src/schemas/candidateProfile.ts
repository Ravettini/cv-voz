import { z } from "zod";

const optionalString = z.string().trim().max(500).optional().or(z.literal("")).transform((v) => (v ? v : undefined));
const optionalLong = z.string().trim().max(4000).optional().or(z.literal("")).transform((v) => (v ? v : undefined));
const softId = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === undefined || v === null || String(v).trim() === "" ? undefined : String(v)));

function coerceLanguageLevel(raw: unknown): "basico" | "intermedio" | "avanzado" | "bilingue" | "nativo" {
  const s = String(raw ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
  if (!s) return "intermedio";
  if (/(nativ|madre|mother)/.test(s)) return "nativo";
  if (/biling/.test(s)) return "bilingue";
  if (/(avanz|fluent|c1|c2|proficient)/.test(s)) return "avanzado";
  if (/(inter|b1|b2|medium)/.test(s)) return "intermedio";
  if (/(basic|basico|a1|a2|beginner)/.test(s)) return "basico";
  return "intermedio";
}

const LanguageLevelSchema = z.preprocess(
  coerceLanguageLevel,
  z.enum(["basico", "intermedio", "avanzado", "bilingue", "nativo"]),
);

const SoftEmailSchema = z.preprocess((v) => {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : undefined;
}, z.string().email().optional());

export const ExperienceSchema = z.object({
  id: z.string().min(1),
  company: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(200),
  startDate: optionalString,
  endDate: optionalString,
  current: z.boolean().default(false),
  responsibilities: z.array(z.string().trim().min(1).max(1000)).default([]),
  achievements: z.array(z.string().trim().min(1).max(1000)).default([]),
  tools: z.array(z.string().trim().min(1).max(100)).default([]),
});

export const EducationSchema = z.object({
  id: z.string().min(1),
  institution: z.string().trim().min(1).max(200),
  field: optionalString,
  degree: optionalString,
  status: z.enum(["completed", "in_progress", "incomplete"]).optional(),
  startDate: optionalString,
  endDate: optionalString,
  estimatedEndDate: optionalString,
});

export const CourseSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  institution: optionalString,
  date: optionalString,
  status: optionalString,
});

export const CertificationSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  institution: optionalString,
  date: optionalString,
  credentialId: optionalString,
});

export const SkillSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  category: optionalString,
});

export const LanguageSchema = z.object({
  id: z.string().min(1),
  language: z.string().trim().min(1).max(80),
  level: z.enum(["basico", "intermedio", "avanzado", "bilingue", "nativo"]),
  certification: optionalString,
});

export const ProfessionalLinkSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(80),
  url: z.string().trim().min(1).max(500),
});

export const CandidateProfileSchema = z.object({
  id: z.string().min(1),
  personal: z.object({
    fullName: z.string().trim().min(1).max(200),
    city: optionalString,
    country: optionalString,
    email: SoftEmailSchema,
    phone: optionalString,
  }),
  target: z.object({
    desiredRole: optionalString,
    industry: optionalString,
    seniority: optionalString,
    jobType: optionalString,
  }),
  professionalSummary: optionalLong,
  experiences: z.array(ExperienceSchema).default([]),
  education: z.array(EducationSchema).default([]),
  courses: z.array(CourseSchema).default([]),
  certifications: z.array(CertificationSchema).default([]),
  skills: z.array(SkillSchema).default([]),
  languages: z.array(LanguageSchema).default([]),
  links: z.array(ProfessionalLinkSchema).default([]),
  missingInformation: z.array(z.string().trim().min(1).max(500)).default([]),
  warnings: z.array(z.string().trim().min(1).max(500)).default([]),
});

/** Esquema flexible para salida de Gemini (ids opcionales, niveles de idioma tolerantes). */
export const GeminiCandidateProfileSchema = z.object({
  id: softId,
  personal: z
    .object({
      fullName: z.string().trim().min(1).max(200).default("Candidato"),
      city: optionalString,
      country: optionalString,
      email: SoftEmailSchema,
      phone: optionalString,
    })
    .default({ fullName: "Candidato" }),
  target: z
    .object({
      desiredRole: optionalString,
      industry: optionalString,
      seniority: optionalString,
      jobType: optionalString,
    })
    .default({}),
  professionalSummary: optionalLong,
  experiences: z
    .array(
      z.object({
        id: softId,
        company: z.string().trim().min(1).max(200).default("Empresa"),
        role: z.string().trim().min(1).max(200).default("Rol"),
        startDate: optionalString,
        endDate: optionalString,
        current: z.boolean().default(false),
        responsibilities: z.array(z.string()).default([]),
        achievements: z.array(z.string()).default([]),
        tools: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        id: softId,
        institution: z.string().trim().min(1).max(200).default("Institución"),
        field: optionalString,
        degree: optionalString,
        status: z
          .preprocess((v) => {
            const s = String(v ?? "").toLowerCase();
            if (s.includes("progress") || s.includes("curso")) return "in_progress";
            if (s.includes("incomp")) return "incomplete";
            if (s.includes("complet") || s.includes("termin")) return "completed";
            return v;
          }, z.enum(["completed", "in_progress", "incomplete"]).optional())
          .optional(),
        startDate: optionalString,
        endDate: optionalString,
        estimatedEndDate: optionalString,
      }),
    )
    .default([]),
  courses: z
    .array(
      z.object({
        id: softId,
        name: z.string().trim().min(1).max(200),
        institution: optionalString,
        date: optionalString,
        status: optionalString,
      }),
    )
    .default([]),
  certifications: z
    .array(
      z.object({
        id: softId,
        name: z.string().trim().min(1).max(200),
        institution: optionalString,
        date: optionalString,
        credentialId: optionalString,
      }),
    )
    .default([]),
  skills: z
    .array(
      z.object({
        id: softId,
        name: z.string().trim().min(1).max(100),
        category: optionalString,
      }),
    )
    .default([]),
  languages: z
    .array(
      z.object({
        id: softId,
        language: z.string().trim().min(1).max(80),
        level: LanguageLevelSchema,
        certification: optionalString,
      }),
    )
    .default([]),
  links: z
    .array(
      z.object({
        id: softId,
        label: z.string().trim().min(1).max(80).default("Link"),
        url: z.string().trim().min(1).max(500),
      }),
    )
    .default([]),
  missingInformation: z.array(z.string().trim().min(1).max(500)).default([]),
  warnings: z.array(z.string().trim().min(1).max(500)).default([]),
});

export type CandidateProfileInput = z.input<typeof CandidateProfileSchema>;
export type GeminiCandidateProfileInput = z.input<typeof GeminiCandidateProfileSchema>;
