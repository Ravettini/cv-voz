import type { InterviewSession, TranscriptSegment, CandidateProfile } from "@cv-voz/shared";
import { apiFetch } from "./apiClient";

export const interviewApi = {
  create: () =>
    apiFetch<{ session: InterviewSession; segments: TranscriptSegment[]; opening: string }>("/api/interviews", {
      method: "POST",
    }),
  get: (id: string) =>
    apiFetch<{ session: InterviewSession; segments: TranscriptSegment[] }>(`/api/interviews/${id}`),
  addSegments: (id: string, segments: Array<{ role: "user" | "assistant"; text: string }>) =>
    apiFetch<{ segments: TranscriptSegment[] }>(`/api/interviews/${id}/segments`, {
      method: "POST",
      body: JSON.stringify({ segments }),
    }),
  chat: (id: string, text: string) =>
    apiFetch<{ user: TranscriptSegment; assistant: TranscriptSegment }>(`/api/interviews/${id}/chat`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  pause: (id: string) => apiFetch<{ session: InterviewSession }>(`/api/interviews/${id}/pause`, { method: "POST" }),
  resume: (id: string) => apiFetch<{ session: InterviewSession }>(`/api/interviews/${id}/resume`, { method: "POST" }),
  finalize: (id: string, segments: Array<{ role: "user" | "assistant"; text: string }>) =>
    apiFetch<{ session: InterviewSession; profile: CandidateProfile }>(`/api/interviews/${id}/finalize`, {
      method: "POST",
      body: JSON.stringify({ segments }),
    }),
};

export const aiApi = {
  liveToken: () =>
    apiFetch<{
      token: string;
      model: string;
      apiVersion: string;
      expiresAt: string;
      demo: boolean;
      voice: string;
    }>("/api/ai/live-token", { method: "POST" }),
};
