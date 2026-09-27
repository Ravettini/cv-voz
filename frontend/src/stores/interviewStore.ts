import { create } from "zustand";
import type { InterviewSession, TranscriptSegment } from "@cv-voz/shared";

export type InterviewUiState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "paused" | "error";

interface InterviewState {
  session: InterviewSession | null;
  segments: TranscriptSegment[];
  uiState: InterviewUiState;
  liveText: string;
  caption: string;
  mode: "voice" | "text";
  error: string | null;
  setSession: (session: InterviewSession | null) => void;
  setSegments: (segments: TranscriptSegment[]) => void;
  addSegment: (segment: TranscriptSegment) => void;
  setUiState: (uiState: InterviewUiState) => void;
  setLiveText: (text: string) => void;
  setCaption: (text: string) => void;
  setMode: (mode: "voice" | "text") => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useInterviewStore = create<InterviewState>((set) => ({
  session: null,
  segments: [],
  uiState: "idle",
  liveText: "",
  caption: "",
  mode: "voice",
  error: null,
  setSession: (session) => set({ session }),
  setSegments: (segments) => set({ segments }),
  addSegment: (segment) => set((s) => ({ segments: [...s.segments, segment] })),
  setUiState: (uiState) => set({ uiState }),
  setLiveText: (liveText) => set({ liveText }),
  setCaption: (caption) => set({ caption }),
  setMode: (mode) => set({ mode }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      session: null,
      segments: [],
      uiState: "idle",
      liveText: "",
      caption: "",
      mode: "voice",
      error: null,
    }),
}));
