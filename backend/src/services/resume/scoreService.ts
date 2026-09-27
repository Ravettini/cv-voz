import type { AtsScore, CandidateProfile, ResumeContent } from "@cv-voz/shared";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function humanizeSuggestion(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  if (/^[a-z0-9_.]+$/i.test(t) || t.includes(".") && !t.includes(" ")) {
    // Ignore technical field names like personal.photoUrl
    return null;
  }
  if (/photoUrl|education\.detail|missingInformation/i.test(t)) return null;
  return t;
}

export function scoreResume(profile: CandidateProfile, content: ResumeContent): AtsScore {
  const suggestions: string[] = [];

  for (const item of content.missingInformation) {
    const human = humanizeSuggestion(item);
    if (human) suggestions.push(human);
  }

  let professionalInfo = 40;
  if (profile.personal.fullName) professionalInfo += 20;
  if (profile.personal.email) professionalInfo += 15;
  if (profile.personal.phone) professionalInfo += 10;
  if (profile.personal.city || profile.personal.country) professionalInfo += 10;
  if (profile.target.desiredRole) professionalInfo += 5;

  let contentScore = 20;
  if (profile.experiences.length > 0) contentScore += 25;
  if (profile.experiences.some((e) => e.achievements.length > 0 || e.responsibilities.length > 0)) contentScore += 15;
  if (profile.education.length > 0) contentScore += 15;
  if (profile.skills.length >= 3) contentScore += 15;
  else if (profile.skills.length > 0) contentScore += 8;
  if (profile.languages.length > 0) contentScore += 10;

  const bullets = content.experiences.flatMap((e) => e.bullets);
  let clarity = 35;
  if (content.professionalSummary.length >= 80 && content.professionalSummary.length <= 900) clarity += 20;
  if (bullets.length >= 3) clarity += 20;
  if (bullets.every((b) => b.length < 280)) clarity += 15;
  if (!/proactiv|apasionad|excelente jugador|orientad[oa] a resultados/i.test(content.professionalSummary)) {
    clarity += 10;
  }

  let atsCompatibility = 40;
  if (content.skills.length > 0) atsCompatibility += 15;
  if (content.experiences.every((e) => e.period)) atsCompatibility += 15;
  if (content.experiences.every((e) => e.company && e.role)) atsCompatibility += 15;
  if (content.personal.email || content.personal.phone) atsCompatibility += 15;

  if (!profile.personal.email) suggestions.push("Agregá un correo de contacto para que puedan escribirte.");
  if (profile.experiences.some((e) => e.achievements.length === 0)) {
    suggestions.push("Podríamos mejorar alguna experiencia si agregás un resultado concreto.");
  }
  if (profile.experiences.some((e) => !e.startDate)) {
    suggestions.push("Las fechas aproximadas de cada trabajo ayudan a la lectura del CV.");
  }

  const overall = clamp(
    professionalInfo * 0.25 + contentScore * 0.3 + clarity * 0.2 + atsCompatibility * 0.25,
  );

  return {
    overall,
    content: clamp(contentScore),
    clarity: clamp(clarity),
    atsCompatibility: clamp(atsCompatibility),
    professionalInfo: clamp(professionalInfo),
    suggestions: [...new Set(suggestions)].slice(0, 6),
  };
}
