export type Provenance = "EXPLICIT" | "AI_WRITTEN";

export interface ProvenancedText {
  text: string;
  provenance: Provenance;
}

export interface PersonalInfo {
  fullName: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
}

export interface TargetRole {
  desiredRole?: string;
  industry?: string;
  seniority?: string;
  jobType?: string;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  startDate?: string;
  endDate?: string;
  current: boolean;
  responsibilities: string[];
  achievements: string[];
  tools: string[];
}

export interface Education {
  id: string;
  institution: string;
  field?: string;
  degree?: string;
  status?: "completed" | "in_progress" | "incomplete";
  startDate?: string;
  endDate?: string;
  estimatedEndDate?: string;
}

export interface Course {
  id: string;
  name: string;
  institution?: string;
  date?: string;
  status?: string;
}

export interface Certification {
  id: string;
  name: string;
  institution?: string;
  date?: string;
  credentialId?: string;
}

export interface Skill {
  id: string;
  name: string;
  category?: string;
}

export type LanguageLevel = "basico" | "intermedio" | "avanzado" | "bilingue" | "nativo";

export interface Language {
  id: string;
  language: string;
  level: LanguageLevel;
  certification?: string;
}

export interface ProfessionalLink {
  id: string;
  label: string;
  url: string;
}

export interface CandidateProfile {
  id: string;
  personal: PersonalInfo;
  target: TargetRole;
  professionalSummary?: string;
  experiences: Experience[];
  education: Education[];
  courses: Course[];
  certifications: Certification[];
  skills: Skill[];
  languages: Language[];
  links: ProfessionalLink[];
  missingInformation: string[];
  warnings: string[];
}
