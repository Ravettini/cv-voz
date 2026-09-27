export type InterviewStatus = "active" | "paused" | "completed" | "cancelled";

export type TranscriptRole = "user" | "assistant";

export interface TranscriptSegment {
  id: string;
  sessionId: string;
  role: TranscriptRole;
  text: string;
  sequence: number;
  createdAt: string;
}

export interface InterviewSession {
  id: string;
  userId: string;
  status: InterviewStatus;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewWithTranscript {
  session: InterviewSession;
  segments: TranscriptSegment[];
}
