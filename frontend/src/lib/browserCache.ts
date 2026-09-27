import type { CandidateProfile, InterviewSession, ResumeWithContent, TranscriptSegment } from "@cv-voz/shared";

const KEY = "cv-voz-browser-cache";

export type BrowserCache = {
  interviews: InterviewSession[];
  segmentsBySession: Record<string, TranscriptSegment[]>;
  profiles: Array<CandidateProfile & { interviewSessionId?: string }>;
  resumes: ResumeWithContent[];
  photoUrl?: string;
};

const empty = (): BrowserCache => ({
  interviews: [],
  segmentsBySession: {},
  profiles: [],
  resumes: [],
});

export function readBrowserCache(): BrowserCache | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BrowserCache;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      interviews: parsed.interviews ?? [],
      segmentsBySession: parsed.segmentsBySession ?? {},
      profiles: parsed.profiles ?? [],
      resumes: parsed.resumes ?? [],
      photoUrl: parsed.photoUrl,
    };
  } catch {
    return null;
  }
}

export function writeBrowserCache(cache: BrowserCache): void {
  localStorage.setItem(KEY, JSON.stringify(cache));
}

function load(): BrowserCache {
  return readBrowserCache() ?? empty();
}

function save(cache: BrowserCache): void {
  writeBrowserCache(cache);
}

function upsertResume(cache: BrowserCache, resume: ResumeWithContent): void {
  const index = cache.resumes.findIndex((item) => item.id === resume.id);
  if (index >= 0) {
    const prev = cache.resumes[index];
    cache.resumes[index] = {
      ...prev,
      ...resume,
      content: resume.content ?? prev.content,
      atsScore: resume.atsScore ?? prev.atsScore,
    };
  } else {
    cache.resumes.unshift(resume);
  }
}

function rememberSession(cache: BrowserCache, session: InterviewSession): void {
  const index = cache.interviews.findIndex((item) => item.id === session.id);
  if (index >= 0) cache.interviews[index] = session;
  else cache.interviews.unshift(session);
  if (!cache.segmentsBySession[session.id]) cache.segmentsBySession[session.id] = [];
}

function rememberSegments(cache: BrowserCache, sessionId: string, segments: TranscriptSegment[], replace = false): void {
  if (replace) {
    cache.segmentsBySession[sessionId] = segments;
    return;
  }
  const current = cache.segmentsBySession[sessionId] ?? [];
  const known = new Set(current.map((segment) => segment.id));
  cache.segmentsBySession[sessionId] = [...current, ...segments.filter((segment) => !known.has(segment.id))];
}

/** Guarda en localStorage lo que devuelve la API, para sobrevivir a un reinicio. */
export function rememberApiResult(path: string, method: string, data: unknown): void {
  if (!data || typeof data !== "object") return;
  const cache = load();
  const body = data as Record<string, unknown>;
  const verb = method.toUpperCase();

  if (path === "/api/interviews" && verb === "POST" && body.session && Array.isArray(body.segments)) {
    rememberSession(cache, body.session as InterviewSession);
    rememberSegments(cache, (body.session as InterviewSession).id, body.segments as TranscriptSegment[], true);
  }

  const interviewMatch = path.match(/^\/api\/interviews\/([^/]+)$/);
  if (interviewMatch && verb === "GET" && body.session && Array.isArray(body.segments)) {
    rememberSession(cache, body.session as InterviewSession);
    rememberSegments(cache, interviewMatch[1], body.segments as TranscriptSegment[], true);
  }

  const segmentsMatch = path.match(/^\/api\/interviews\/([^/]+)\/segments$/);
  if (segmentsMatch && Array.isArray(body.segments)) {
    rememberSegments(cache, segmentsMatch[1], body.segments as TranscriptSegment[]);
  }

  const chatMatch = path.match(/^\/api\/interviews\/([^/]+)\/chat$/);
  if (chatMatch && body.user && body.assistant) {
    rememberSegments(cache, chatMatch[1], [body.user as TranscriptSegment, body.assistant as TranscriptSegment]);
  }

  const finalizeMatch = path.match(/^\/api\/interviews\/([^/]+)\/finalize$/);
  if (finalizeMatch && body.profile) {
    const profile = body.profile as CandidateProfile & { interviewSessionId?: string };
    profile.interviewSessionId = profile.interviewSessionId ?? finalizeMatch[1];
    cache.profiles = [profile, ...cache.profiles.filter((item) => item.id !== profile.id)];
    if (body.session) rememberSession(cache, body.session as InterviewSession);
  }

  if (path.startsWith("/api/candidate-profile") && body.profile) {
    const profile = body.profile as CandidateProfile & { interviewSessionId?: string };
    cache.profiles = [profile, ...cache.profiles.filter((item) => item.id !== profile.id)];
  }

  if (path === "/api/resumes" && verb === "GET" && Array.isArray(body.resumes)) {
    for (const resume of body.resumes as ResumeWithContent[]) upsertResume(cache, resume);
  }

  if (body.resume && typeof body.resume === "object") {
    upsertResume(cache, body.resume as ResumeWithContent);
  }

  if (path === "/api/dev/seed-demo" && body.profile && body.resume) {
    const profile = body.profile as CandidateProfile;
    cache.profiles = [profile, ...cache.profiles.filter((item) => item.id !== profile.id)];
    upsertResume(cache, body.resume as ResumeWithContent);
  }

  const deleteMatch = path.match(/^\/api\/resumes\/([^/]+)$/);
  if (deleteMatch && verb === "DELETE") {
    cache.resumes = cache.resumes.filter((resume) => resume.id !== deleteMatch[1]);
  }

  if (typeof body.photoUrl === "string") cache.photoUrl = body.photoUrl;

  save(cache);
}

export function cacheHasData(cache: BrowserCache | null): boolean {
  if (!cache) return false;
  return cache.interviews.length > 0 || cache.profiles.length > 0 || cache.resumes.length > 0;
}
