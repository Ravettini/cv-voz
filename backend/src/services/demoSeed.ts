import { randomUUID } from "node:crypto";
import type { CandidateProfile } from "@cv-voz/shared";
import { isLocalMode } from "../config/env.js";
import { HttpError } from "../middleware/errorHandler.js";
import { optimizeResumeContent } from "../services/gemini/atsService.js";
import { localDb, LOCAL_USER_ID } from "../services/localStore.js";
import { scoreResume } from "../services/resume/scoreService.js";
import {
  createResume,
  saveResumeVersion,
  withGenerateLock,
} from "../services/resumeStore.js";
import { saveCandidateProfile } from "../services/profileStore.js";

function buildDemoProfile(): CandidateProfile {
  return {
    id: randomUUID(),
    personal: {
      fullName: "Juan Doe",
      city: "Buenos Aires",
      country: "Argentina",
      email: "juan.doe@email.com",
      phone: "+54 11 5555-1234",
    },
    target: {
      desiredRole: "Desarrollador Web Full Stack",
      industry: "Tecnología",
      seniority: "Semi senior",
      jobType: "Full time",
    },
    professionalSummary:
      "Desarrollador web full stack con experiencia en aplicaciones React y APIs Express. Trabajó en el Gobierno de la Ciudad de Buenos Aires liderando mejoras de sistemas internos con PostgreSQL. Busca roles donde combinar frontend, backend y trabajo en equipo.",
    experiences: [
      {
        id: "exp-1",
        company: "Gobierno de la Ciudad de Buenos Aires",
        role: "Desarrollador web full stack",
        startDate: "03/2023",
        endDate: undefined,
        current: true,
        responsibilities: [
          "Desarrollo de interfaces con React y TypeScript para sistemas internos usados por equipos de gestión",
          "Diseño e implementación de APIs REST con Express y PostgreSQL, incluyendo consultas y permisos por rol",
          "Coordinación con producto y soporte para priorizar incidencias y mejoras de los módulos en producción",
          "Revisión de código y acompañamiento a compañeros nuevos en el flujo de Git y despliegues",
        ],
        achievements: [
          "Mejoró un módulo de gestión que tardaba en cargar consultas frecuentes, reescribiendo consultas y el armado de la pantalla",
          "Documentó flujos técnicos del equipo para que el onboarding no dependiera de una sola persona",
        ],
        tools: ["React", "TypeScript", "Express", "PostgreSQL", "Git"],
      },
      {
        id: "exp-2",
        company: "Estudio Norte",
        role: "Desarrollador frontend",
        startDate: "06/2021",
        endDate: "02/2023",
        current: false,
        responsibilities: [
          "Maquetado de sitios y paneles responsive a partir de diseños en Figma",
          "Componentes reutilizables en React con formularios, validaciones y estados de carga y error",
          "Integración con APIs del backend y ajuste de textos junto al equipo de contenido",
        ],
        achievements: [
          "Entregó el rediseño del sitio institucional en el plazo acordado con el cliente",
          "Unificó estilos sueltos en una librería chica de componentes para no repetir pantallas",
        ],
        tools: ["React", "JavaScript", "HTML", "CSS", "Figma"],
      },
      {
        id: "exp-3",
        company: "Kiosco familiar",
        role: "Atención y administración",
        startDate: "2019",
        endDate: "2021",
        current: false,
        responsibilities: [
          "Atención al público, caja y reposición de mercadería en turnos de mañana y tarde",
          "Control de stock y armado de planillas en Excel para compras semanales",
        ],
        achievements: ["Ordenó el registro de faltantes para que las compras no dependieran de la memoria"],
        tools: ["Excel", "Atención al cliente"],
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Universidad de Buenos Aires",
        field: "Ingeniería en Informática",
        degree: "Ingeniería en Informática",
        status: "in_progress",
        startDate: "2020",
      },
    ],
    courses: [
      {
        id: "course-1",
        name: "React avanzado",
        institution: "Capacitación online",
        date: "2024",
      },
      {
        id: "course-2",
        name: "SQL y modelado de datos",
        institution: "Curso corto",
        date: "2023",
      },
    ],
    certifications: [
      {
        id: "cert-1",
        name: "Scrum fundamentals",
        institution: "Capacitación interna",
        date: "2024",
      },
    ],
    skills: [
      { id: "skill-1", name: "React" },
      { id: "skill-2", name: "TypeScript" },
      { id: "skill-3", name: "JavaScript" },
      { id: "skill-4", name: "Node.js" },
      { id: "skill-5", name: "Express" },
      { id: "skill-6", name: "PostgreSQL" },
      { id: "skill-7", name: "HTML y CSS" },
      { id: "skill-8", name: "Git" },
      { id: "skill-9", name: "Figma" },
      { id: "skill-10", name: "Excel" },
    ],
    languages: [
      { id: "lang-1", language: "Español", level: "nativo" },
      { id: "lang-2", language: "Inglés", level: "intermedio" },
    ],
    links: [
      { id: "link-1", label: "GitHub", url: "https://github.com/ejemplo" },
      { id: "link-2", label: "LinkedIn", url: "https://linkedin.com/in/ejemplo" },
    ],
    missingInformation: [],
    warnings: [],
  };
}

export async function seedDemoResume() {
  if (!isLocalMode()) {
    throw new HttpError(403, "El seed de demo solo está disponible en modo local.", "FORBIDDEN");
  }

  const profile = buildDemoProfile();
  const interview = localDb.createInterview(LOCAL_USER_ID);
  localDb.appendSegment({
    userId: LOCAL_USER_ID,
    sessionId: interview.id,
    role: "assistant",
    text: "Entrevista de demostración con datos de prueba.",
  });
  localDb.appendSegment({
    userId: LOCAL_USER_ID,
    sessionId: interview.id,
    role: "user",
    text: "Soy Juan Doe, desarrollador full stack en GCBA.",
  });

  const saved = await saveCandidateProfile({
    userId: LOCAL_USER_ID,
    interviewSessionId: interview.id,
    profile,
  });

  return withGenerateLock(LOCAL_USER_ID, async () => {
    const resume = await createResume({
      userId: LOCAL_USER_ID,
      candidateProfileId: saved.id,
      name: `CV demo — ${saved.personal.fullName}`,
      targetRole: saved.target.desiredRole,
      templateId: "modern",
    });

    const content = await optimizeResumeContent({
      profile: saved,
      targetRole: saved.target.desiredRole,
    });
    const atsScore = scoreResume(saved, content);
    const generated = await saveResumeVersion({
      userId: LOCAL_USER_ID,
      resumeId: resume.id,
      content,
      atsScore,
      templateId: "modern",
      name: resume.name,
      targetRole: resume.targetRole,
    });

    return { profile: saved, resume: generated };
  });
}
