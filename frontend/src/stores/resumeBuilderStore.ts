import { create } from "zustand";
import type { ResumeWithContent, TemplateId } from "@cv-voz/shared";

interface ResumeBuilderState {
  resume: ResumeWithContent | null;
  selectedTemplate: TemplateId;
  photoUrl?: string;
  generating: boolean;
  setResume: (resume: ResumeWithContent | null) => void;
  setSelectedTemplate: (template: TemplateId) => void;
  setPhotoUrl: (photoUrl?: string) => void;
  setGenerating: (generating: boolean) => void;
}

export const useResumeBuilderStore = create<ResumeBuilderState>((set) => ({
  resume: null,
  selectedTemplate: "ats",
  photoUrl: undefined,
  generating: false,
  setResume: (resume) => set({ resume }),
  setSelectedTemplate: (selectedTemplate) => set({ selectedTemplate }),
  setPhotoUrl: (photoUrl) => set({ photoUrl }),
  setGenerating: (generating) => set({ generating }),
}));
