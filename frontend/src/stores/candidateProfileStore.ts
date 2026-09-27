import { create } from "zustand";
import type { CandidateProfile } from "@cv-voz/shared";

interface CandidateProfileState {
  profile: CandidateProfile | null;
  setProfile: (profile: CandidateProfile | null) => void;
  updateProfile: (updater: (current: CandidateProfile) => CandidateProfile) => void;
}

export const useCandidateProfileStore = create<CandidateProfileState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  updateProfile: (updater) =>
    set((state) => (state.profile ? { profile: updater(state.profile) } : state)),
}));
