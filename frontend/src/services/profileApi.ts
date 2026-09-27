import type { CandidateProfile } from "@cv-voz/shared";
import { apiFetch } from "./apiClient";

export const profileApi = {
  get: () => apiFetch<{ profile: CandidateProfile }>("/api/candidate-profile"),
  update: (profile: CandidateProfile) =>
    apiFetch<{ profile: CandidateProfile }>("/api/candidate-profile", {
      method: "PUT",
      body: JSON.stringify({ profile }),
    }),
  getPhoto: () => apiFetch<{ photoUrl?: string }>("/api/profile/photo"),
  uploadPhoto: (file: Blob) => {
    const form = new FormData();
    form.append("photo", file, "photo.jpg");
    return apiFetch<{ photoUrl: string }>("/api/profile/photo", { method: "POST", body: form });
  },
  deletePhoto: () => apiFetch<{ ok: boolean }>("/api/profile/photo", { method: "DELETE" }),
};
