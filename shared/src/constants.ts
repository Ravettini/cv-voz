export const TEMPLATES = [
  {
    id: "ats" as const,
    name: "ATS",
    tagline: "Máxima compatibilidad ATS",
    description:
      "Una columna, sin fotografía y tipografía simple. Diseñamos la estructura para facilitar la lectura automática utilizada por muchos sistemas de selección.",
  },
  {
    id: "professional" as const,
    name: "Profesional",
    tagline: "Corporativo y claro",
    description: "Fotografía pequeña, dos columnas discretas y datos secundarios en el lateral.",
  },
  {
    id: "modern" as const,
    name: "Moderno",
    tagline: "Jerarquía visual fuerte",
    description: "Apropiado para tecnología, marketing y perfiles contemporáneos.",
  },
  {
    id: "executive" as const,
    name: "Ejecutivo",
    tagline: "Sobrio y elegante",
    description: "La experiencia laboral es protagonista, con mínimo ruido visual.",
  },
] as const;

export const LANGUAGE_LEVELS = ["basico", "intermedio", "avanzado", "bilingue", "nativo"] as const;

export const PROCESS_STEPS = [
  { id: 1, label: "Entrevista" },
  { id: 2, label: "Revisar información" },
  { id: 3, label: "Foto" },
  { id: 4, label: "Diseño" },
  { id: 5, label: "Tu CV" },
] as const;

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
