export type TemplateId = "ats" | "professional" | "modern" | "executive";

export interface ResumeExperience {
  company: string;
  role: string;
  period: string;
  bullets: string[];
}

export interface ResumeEducation {
  institution: string;
  title: string;
  period?: string;
  detail?: string;
}

export interface ResumeCourse {
  name: string;
  institution?: string;
  date?: string;
}

export interface ResumeLanguage {
  language: string;
  level: string;
}

export interface ResumeLink {
  label: string;
  url: string;
}

export interface ResumeContent {
  personal: {
    fullName: string;
    city?: string;
    country?: string;
    email?: string;
    phone?: string;
    photoUrl?: string;
  };
  targetRole?: string;
  professionalSummary: string;
  experiences: ResumeExperience[];
  education: ResumeEducation[];
  courses: ResumeCourse[];
  certifications: ResumeCourse[];
  skills: string[];
  languages: ResumeLanguage[];
  links: ResumeLink[];
  missingInformation: string[];
  warnings: string[];
}

export interface AtsScore {
  overall: number;
  content: number;
  clarity: number;
  atsCompatibility: number;
  professionalInfo: number;
  suggestions: string[];
}

export interface Resume {
  id: string;
  userId: string;
  candidateProfileId: string;
  name: string;
  targetRole?: string;
  templateId: TemplateId;
  photoUrl?: string;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeVersion {
  id: string;
  resumeId: string;
  version: number;
  content: ResumeContent;
  atsScore: AtsScore;
  createdAt: string;
}

export interface ResumeWithContent extends Resume {
  content: ResumeContent;
  atsScore: AtsScore;
}
