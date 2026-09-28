import type {
  AtsScore,
  CandidateProfile,
  InterviewSession,
  InterviewStatus,
  Resume,
  ResumeContent,
  ResumeVersion,
  ResumeWithContent,
  TemplateId,
  TranscriptRole,
  TranscriptSegment,
} from "@cv-voz/shared";
import { randomUUID } from "node:crypto";

export const LOCAL_USER_ID = "00000000-0000-4000-8000-000000000001";
export const LOCAL_USER_EMAIL = "local@cvvoz.dev";
export const LOCAL_DEV_TOKEN = "local-dev-token";

type ProfileRow = CandidateProfile & { userId: string; interviewSessionId?: string; updatedAt: string };

const interviews = new Map<string, InterviewSession>();
const segments = new Map<string, TranscriptSegment[]>();
const candidateProfiles = new Map<string, ProfileRow>();
const resumes = new Map<string, Resume>();
const resumeVersions = new Map<string, ResumeVersion[]>();
const photos = new Map<string, string>();

/** Prueba: no persistimos. Los datos viven solo mientras corre el proceso. */
function persist(): void {
  /* intentionally empty */
}

export const localDb = {
  createInterview(userId: string): InterviewSession {
    const now = new Date().toISOString();
    const session: InterviewSession = {
      id: randomUUID(),
      userId,
      status: "active",
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    interviews.set(session.id, session);
    segments.set(session.id, []);
    persist();
    return session;
  },

  getInterview(userId: string, id: string): InterviewSession | null {
    const session = interviews.get(id);
    if (!session || session.userId !== userId) return null;
    return session;
  },

  /** En Vercel cada pedido puede caer en otro proceso. Si falta, la recreamos. */
  ensureInterview(userId: string, id: string): InterviewSession {
    const existing = this.getInterview(userId, id);
    if (existing) return existing;
    const now = new Date().toISOString();
    const session: InterviewSession = {
      id,
      userId,
      status: "active",
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    interviews.set(id, session);
    if (!segments.has(id)) segments.set(id, []);
    return session;
  },

  replaceSegments(sessionId: string, list: TranscriptSegment[]): void {
    segments.set(
      sessionId,
      list.map((segment, index) => ({
        ...segment,
        sessionId,
        sequence: index,
      })),
    );
  },

  updateInterview(userId: string, id: string, status: InterviewStatus, extra: Partial<InterviewSession> = {}): InterviewSession | null {
    const session = this.getInterview(userId, id);
    if (!session) return null;
    const next = { ...session, status, ...extra, updatedAt: new Date().toISOString() };
    interviews.set(id, next);
    persist();
    return next;
  },

  listSegments(sessionId: string): TranscriptSegment[] {
    return [...(segments.get(sessionId) ?? [])].sort((a, b) => a.sequence - b.sequence);
  },

  appendSegment(params: { userId: string; sessionId: string; role: TranscriptRole; text: string }): TranscriptSegment {
    const list = segments.get(params.sessionId) ?? [];
    const segment: TranscriptSegment = {
      id: randomUUID(),
      sessionId: params.sessionId,
      role: params.role,
      text: params.text,
      sequence: list.length,
      createdAt: new Date().toISOString(),
    };
    list.push(segment);
    segments.set(params.sessionId, list);
    persist();
    return segment;
  },

  saveCandidateProfile(params: {
    userId: string;
    interviewSessionId: string;
    profile: CandidateProfile;
  }): CandidateProfile {
    const existing = [...candidateProfiles.values()].find(
      (p) => p.userId === params.userId && p.interviewSessionId === params.interviewSessionId,
    );
    const id = existing?.id ?? params.profile.id;
    const profile = { ...params.profile, id };
    candidateProfiles.set(id, {
      ...profile,
      userId: params.userId,
      interviewSessionId: params.interviewSessionId,
      updatedAt: new Date().toISOString(),
    });
    persist();
    return profile;
  },

  getLatestCandidateProfile(userId: string): CandidateProfile | null {
    const rows = [...candidateProfiles.values()]
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (!rows[0]) return null;
    const { userId: _u, interviewSessionId: _i, updatedAt: _t, ...profile } = rows[0];
    return profile;
  },

  getCandidateProfileById(userId: string, id: string): CandidateProfile | null {
    const row = candidateProfiles.get(id);
    if (!row || row.userId !== userId) return null;
    const { userId: _u, interviewSessionId: _i, updatedAt: _t, ...profile } = row;
    return profile;
  },

  updateCandidateProfile(userId: string, profile: CandidateProfile): CandidateProfile | null {
    const row = candidateProfiles.get(profile.id);
    if (!row || row.userId !== userId) return null;
    candidateProfiles.set(profile.id, {
      ...row,
      ...profile,
      userId,
      updatedAt: new Date().toISOString(),
    });
    persist();
    return profile;
  },

  getPhoto(userId: string): string | undefined {
    return photos.get(userId);
  },

  setPhoto(userId: string, url: string): void {
    photos.set(userId, url);
    persist();
  },

  deletePhoto(userId: string): void {
    photos.delete(userId);
    persist();
  },

  listResumes(userId: string): Resume[] {
    return [...resumes.values()]
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  getResume(userId: string, id: string): Resume | null {
    const resume = resumes.get(id);
    if (!resume || resume.userId !== userId) return null;
    return resume;
  },

  createResume(params: {
    userId: string;
    candidateProfileId: string;
    name: string;
    targetRole?: string;
    templateId: TemplateId;
    photoUrl?: string;
  }): Resume {
    const now = new Date().toISOString();
    const resume: Resume = {
      id: randomUUID(),
      userId: params.userId,
      candidateProfileId: params.candidateProfileId,
      name: params.name,
      targetRole: params.targetRole,
      templateId: params.templateId,
      photoUrl: params.photoUrl,
      currentVersion: 0,
      createdAt: now,
      updatedAt: now,
    };
    resumes.set(resume.id, resume);
    resumeVersions.set(resume.id, []);
    persist();
    return resume;
  },

  saveResumeVersion(params: {
    userId: string;
    resumeId: string;
    content: ResumeContent;
    atsScore: AtsScore;
    templateId?: TemplateId;
    photoUrl?: string;
    name?: string;
    targetRole?: string;
  }): ResumeWithContent | null {
    const resume = this.getResume(params.userId, params.resumeId);
    if (!resume) return null;
    const version = resume.currentVersion + 1;
    const versions = resumeVersions.get(resume.id) ?? [];
    const entry: ResumeVersion = {
      id: randomUUID(),
      resumeId: resume.id,
      version,
      content: params.content,
      atsScore: params.atsScore,
      createdAt: new Date().toISOString(),
    };
    versions.push(entry);
    resumeVersions.set(resume.id, versions);
    const next: Resume = {
      ...resume,
      currentVersion: version,
      templateId: params.templateId ?? resume.templateId,
      photoUrl: params.photoUrl ?? resume.photoUrl,
      name: params.name ?? resume.name,
      targetRole: params.targetRole ?? resume.targetRole,
      updatedAt: new Date().toISOString(),
    };
    resumes.set(resume.id, next);
    persist();
    return { ...next, content: params.content, atsScore: params.atsScore };
  },

  getResumeWithContent(userId: string, id: string): ResumeWithContent | null {
    const resume = this.getResume(userId, id);
    if (!resume || resume.currentVersion < 1) return null;
    const versions = resumeVersions.get(id) ?? [];
    const current = versions.find((v) => v.version === resume.currentVersion);
    if (!current) return null;
    return { ...resume, content: current.content, atsScore: current.atsScore };
  },

  updateResumeTemplate(userId: string, id: string, templateId: TemplateId): Resume | null {
    const resume = this.getResume(userId, id);
    if (!resume) return null;
    const next = { ...resume, templateId, updatedAt: new Date().toISOString() };
    resumes.set(id, next);
    persist();
    return next;
  },

  deleteResume(userId: string, id: string): boolean {
    const resume = this.getResume(userId, id);
    if (!resume) return false;
    resumes.delete(id);
    resumeVersions.delete(id);
    persist();
    return true;
  },

  /** El navegador es la copia durable. Esto solo rellena la memoria del proceso. */
  replaceFromBrowser(
    userId: string,
    snapshot: {
      interviews: InterviewSession[];
      segmentsBySession: Record<string, TranscriptSegment[]>;
      profiles: Array<CandidateProfile & { interviewSessionId?: string }>;
      resumes: ResumeWithContent[];
      photoUrl?: string;
    },
  ): void {
    interviews.clear();
    segments.clear();
    candidateProfiles.clear();
    resumes.clear();
    resumeVersions.clear();
    photos.clear();

    for (const session of snapshot.interviews) {
      interviews.set(session.id, { ...session, userId });
      segments.set(session.id, []);
    }
    for (const [sessionId, list] of Object.entries(snapshot.segmentsBySession)) {
      segments.set(sessionId, list);
    }
    for (const profile of snapshot.profiles) {
      candidateProfiles.set(profile.id, {
        ...profile,
        userId,
        interviewSessionId: profile.interviewSessionId,
        updatedAt: new Date().toISOString(),
      });
    }
    for (const resume of snapshot.resumes) {
      const { content, atsScore, ...meta } = resume;
      const version = content && atsScore ? Math.max(1, meta.currentVersion || 1) : 0;
      resumes.set(resume.id, { ...meta, userId, currentVersion: version });
      if (content && atsScore) {
        resumeVersions.set(resume.id, [
          {
            id: `${resume.id}-v${version}`,
            resumeId: resume.id,
            version,
            content,
            atsScore,
            createdAt: resume.updatedAt,
          },
        ]);
      } else {
        resumeVersions.set(resume.id, []);
      }
    }
    if (snapshot.photoUrl) photos.set(userId, snapshot.photoUrl);
  },
};
