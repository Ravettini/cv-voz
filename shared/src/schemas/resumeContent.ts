import { z } from "zod";

const optionalString = z.string().trim().max(500).optional().or(z.literal("")).transform((v) => (v ? v : undefined));

export const ResumeContentSchema = z.object({
  personal: z.object({
    fullName: z.string().trim().min(1).max(200),
    city: optionalString,
    country: optionalString,
    email: optionalString,
    phone: optionalString,
    photoUrl: optionalString,
  }),
  targetRole: optionalString,
  professionalSummary: z.string().trim().min(1).max(4000),
  experiences: z
    .array(
      z.object({
        company: z.string().trim().min(1).max(200),
        role: z.string().trim().min(1).max(200),
        period: z.string().trim().max(80).default(""),
        bullets: z.array(z.string().trim().min(1).max(800)).default([]),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        institution: z.string().trim().min(1).max(200),
        title: z.string().trim().min(1).max(200),
        period: optionalString,
        detail: optionalString,
      }),
    )
    .default([]),
  courses: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        institution: optionalString,
        date: optionalString,
      }),
    )
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        institution: optionalString,
        date: optionalString,
      }),
    )
    .default([]),
  skills: z.array(z.string().trim().min(1).max(100)).default([]),
  languages: z
    .array(
      z.object({
        language: z.string().trim().min(1).max(80),
        level: z.string().trim().min(1).max(40),
      }),
    )
    .default([]),
  links: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(80),
        url: z.string().trim().min(1).max(500),
      }),
    )
    .default([]),
  missingInformation: z.array(z.string().trim().min(1).max(500)).default([]),
  warnings: z.array(z.string().trim().min(1).max(500)).default([]),
});

export const AtsScoreSchema = z.object({
  overall: z.number().min(0).max(100),
  content: z.number().min(0).max(100),
  clarity: z.number().min(0).max(100),
  atsCompatibility: z.number().min(0).max(100),
  professionalInfo: z.number().min(0).max(100),
  suggestions: z.array(z.string()).default([]),
});

export const TemplateIdSchema = z.enum(["ats", "professional", "modern", "executive"]);
