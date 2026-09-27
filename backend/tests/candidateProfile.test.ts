import { describe, expect, it } from "vitest";
import { CandidateProfileSchema } from "@cv-voz/shared";
import { profileToResumeFallback } from "../src/services/gemini/atsService.js";
import { scoreResume } from "../src/services/resume/scoreService.js";

const sample = CandidateProfileSchema.parse({
  id: "cp-1",
  personal: { fullName: "Ana Pérez", city: "Córdoba", country: "Argentina", email: "ana@example.com" },
  target: { desiredRole: "Diseñadora UX" },
  experiences: [
    {
      id: "exp-1",
      company: "Estudio Norte",
      role: "Diseñadora",
      startDate: "2022",
      current: true,
      responsibilities: ["Diseño de interfaces"],
      achievements: ["Lideré el rediseño del sitio institucional"],
      tools: ["Figma"],
    },
  ],
  education: [{ id: "edu-1", institution: "UNC", field: "Diseño", status: "completed" }],
  courses: [],
  certifications: [],
  skills: [{ id: "s1", name: "Figma" }],
  languages: [{ id: "l1", language: "Español", level: "nativo" }],
  links: [],
  missingInformation: [],
  warnings: [],
});

describe("CandidateProfileSchema", () => {
  it("acepta un perfil válido", () => {
    expect(sample.personal.fullName).toBe("Ana Pérez");
  });

  it("rechaza perfiles sin nombre", () => {
    const result = CandidateProfileSchema.safeParse({
      ...sample,
      personal: { ...sample.personal, fullName: "" },
    });
    expect(result.success).toBe(false);
  });
});

describe("ATS fallback", () => {
  it("no inventa empresas", () => {
    const content = profileToResumeFallback(sample);
    expect(content.experiences.map((e) => e.company)).toEqual(["Estudio Norte"]);
    expect(content.skills).toContain("Figma");
  });
});

describe("scoreResume", () => {
  it("devuelve un score entre 0 y 100", () => {
    const content = profileToResumeFallback(sample);
    const score = scoreResume(sample, content);
    expect(score.overall).toBeGreaterThan(0);
    expect(score.overall).toBeLessThanOrEqual(100);
  });
});
