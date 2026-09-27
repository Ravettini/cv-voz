import type { Resume, ResumeWithContent, TemplateId } from "@cv-voz/shared";
import { readBrowserCache } from "@/lib/browserCache";
import { apiFetch, apiUrl, getAuthToken } from "./apiClient";

export const resumeApi = {
  list: () => apiFetch<{ resumes: Resume[] }>("/api/resumes"),
  create: (payload?: { templateId?: TemplateId; name?: string; candidateProfileId?: string }) =>
    apiFetch<{ resume: Resume }>("/api/resumes", {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    }),
  get: (id: string) => apiFetch<{ resume: Resume | ResumeWithContent }>(`/api/resumes/${id}`),
  generate: (id: string, payload?: { templateId?: TemplateId; regenerate?: boolean }) =>
    apiFetch<{ resume: ResumeWithContent }>(`/api/resumes/${id}/generate`, {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    }),
  changeTemplate: (id: string, templateId: TemplateId) =>
    apiFetch<{ resume: ResumeWithContent | Resume }>(`/api/resumes/${id}/template`, {
      method: "POST",
      body: JSON.stringify({ templateId }),
    }),
  duplicate: (id: string) => apiFetch<{ resume: Resume }>(`/api/resumes/${id}/duplicate`, { method: "POST" }),
  remove: (id: string) => apiFetch<{ ok: boolean }>(`/api/resumes/${id}`, { method: "DELETE" }),
};

function resumeFromCache(id: string): ResumeWithContent | undefined {
  return readBrowserCache()?.resumes.find((item) => item.id === id && item.content);
}

export async function downloadResume(
  source: string | ResumeWithContent,
  kind: "pdf" | "docx",
): Promise<void> {
  const resume = typeof source === "string" ? resumeFromCache(source) : source;
  if (!resume?.content) {
    throw new Error("No encontramos el contenido del CV en este navegador.");
  }

  const token = await getAuthToken();
  const res = await fetch(apiUrl("/api/resumes/export"), {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      kind,
      templateId: resume.templateId,
      name: resume.name,
      content: resume.content,
    }),
  });
  if (!res.ok) throw new Error("No pudimos descargar el archivo.");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${resume.name || "cv"}.${kind}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
