import { CandidateProfileSchema, type CandidateProfile } from "@cv-voz/shared";
import { HttpError } from "../middleware/errorHandler.js";
import { localDb } from "./localStore.js";

export async function saveCandidateProfile(params: {
  userId: string;
  interviewSessionId: string;
  profile: CandidateProfile;
}): Promise<CandidateProfile> {
  const parsed = CandidateProfileSchema.parse(params.profile);
  return localDb.saveCandidateProfile({ ...params, profile: parsed });
}

export async function getLatestCandidateProfile(userId: string): Promise<CandidateProfile | null> {
  return localDb.getLatestCandidateProfile(userId);
}

export async function getCandidateProfileById(userId: string, id: string): Promise<CandidateProfile> {
  const profile = localDb.getCandidateProfileById(userId, id);
  if (!profile) throw new HttpError(404, "No encontramos tu información.", "NOT_FOUND");
  return profile;
}

export async function updateCandidateProfile(userId: string, profile: CandidateProfile): Promise<CandidateProfile> {
  const parsed = CandidateProfileSchema.parse(profile);
  const updated = localDb.updateCandidateProfile(userId, parsed);
  if (!updated) throw new HttpError(404, "No encontramos tu información.", "NOT_FOUND");
  return updated;
}

export async function getProfilePhotoUrl(userId: string): Promise<string | undefined> {
  return localDb.getPhoto(userId);
}
