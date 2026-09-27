import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, Sparkles } from "lucide-react";
import { TEMPLATES, type ResumeContent, type TemplateId } from "@cv-voz/shared";
import { ProcessStepper } from "@/components/ProcessStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResumePreview } from "@/features/templates/templates";
import { cn } from "@/lib/utils";
import { profileApi } from "@/services/profileApi";
import { resumeApi } from "@/services/resumeApi";
import { useCandidateProfileStore } from "@/stores/candidateProfileStore";
import { useResumeBuilderStore } from "@/stores/resumeBuilderStore";
import { toast } from "@/stores/toastStore";

const TEMPLATE_TONES = [
  "bg-gradient-to-br from-primary-soft to-sky",
  "bg-gradient-to-br from-mint to-sky",
  "bg-gradient-to-br from-peach to-blush",
  "bg-gradient-to-br from-butter to-peach",
];

function draftContentFromProfile(
  fullName: string,
  desiredRole?: string,
  summary?: string,
  photoUrl?: string,
): ResumeContent {
  return {
    personal: { fullName, photoUrl },
    targetRole: desiredRole,
    professionalSummary: summary || "Tu resumen profesional aparecerá acá después de optimizar la redacción.",
    experiences: [],
    education: [],
    courses: [],
    certifications: [],
    skills: [],
    languages: [],
    links: [],
    missingInformation: [],
    warnings: [],
  };
}

export function TemplatesPage() {
  const navigate = useNavigate();
  const profile = useCandidateProfileStore((s) => s.profile);
  const { selectedTemplate, setSelectedTemplate, photoUrl, setPhotoUrl, setResume, setGenerating, generating } =
    useResumeBuilderStore();
  const [previewContent, setPreviewContent] = useState<ResumeContent | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        if (!profile) {
          const { profile: loaded } = await profileApi.get();
          useCandidateProfileStore.getState().setProfile(loaded);
        }
        const photo = await profileApi.getPhoto();
        if (photo.photoUrl) setPhotoUrl(photo.photoUrl);
      } catch {
        /* optional */
      }
    })();
  }, [profile, setPhotoUrl]);

  const currentProfile = useCandidateProfileStore.getState().profile || profile;

  useEffect(() => {
    if (!currentProfile) return;
    setPreviewContent({
      personal: {
        fullName: currentProfile.personal.fullName,
        city: currentProfile.personal.city,
        country: currentProfile.personal.country,
        email: currentProfile.personal.email,
        phone: currentProfile.personal.phone,
        photoUrl,
      },
      targetRole: currentProfile.target.desiredRole,
      professionalSummary:
        currentProfile.professionalSummary ||
        "Redacción profesional basada en tu experiencia confirmada.",
      experiences: currentProfile.experiences.map((e) => ({
        company: e.company,
        role: e.role,
        period: [e.startDate, e.current ? "Actualidad" : e.endDate].filter(Boolean).join(" — "),
        bullets: [...e.achievements, ...e.responsibilities].slice(0, 6),
      })),
      education: currentProfile.education.map((e) => ({
        institution: e.institution,
        title: [e.degree, e.field].filter(Boolean).join(" · ") || e.institution,
        period: [e.startDate, e.endDate].filter(Boolean).join(" — "),
      })),
      courses: currentProfile.courses.map((c) => ({ name: c.name, institution: c.institution, date: c.date })),
      certifications: currentProfile.certifications.map((c) => ({ name: c.name, institution: c.institution, date: c.date })),
      skills: currentProfile.skills.map((s) => s.name),
      languages: currentProfile.languages.map((l) => ({ language: l.language, level: l.level })),
      links: currentProfile.links.map((l) => ({ label: l.label, url: l.url })),
      missingInformation: currentProfile.missingInformation,
      warnings: currentProfile.warnings,
    });
  }, [currentProfile, photoUrl]);

  const cards = useMemo(() => TEMPLATES, []);

  const create = async () => {
    if (!currentProfile) {
      toast({ title: "Primero revisá tu información", description: "Si reiniciaste el servidor, volvé a finalizar la entrevista.", variant: "error" });
      navigate("/review");
      return;
    }
    setGenerating(true);
    try {
      const { resume } = await resumeApi.create({
        templateId: selectedTemplate,
        candidateProfileId: currentProfile.id,
        name: currentProfile.target.desiredRole || `CV de ${currentProfile.personal.fullName}`,
      });
      const generated = await resumeApi.generate(resume.id, { templateId: selectedTemplate });
      setResume(generated.resume);
      navigate(`/resume/${generated.resume.id}`);
    } catch (err) {
      toast({
        title: "No pudimos crear tu CV",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <ProcessStepper current={4} />
      <div className="mb-8 animate-fade-up">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Elegí un <span className="text-gradient">diseño</span>
        </h1>
        <p className="mt-2 text-muted">
          Cada vista usa tus datos reales. Diseñamos la estructura para facilitar la lectura automática utilizada por
          muchos sistemas de selección.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {cards.map((tpl, index) => {
          const selected = selectedTemplate === tpl.id;
          const content =
            previewContent ||
            draftContentFromProfile("Tu nombre", "Tu objetivo", undefined, photoUrl);
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setSelectedTemplate(tpl.id as TemplateId)}
              style={{ animationDelay: `${index * 90}ms` }}
              className={cn(
                "group relative animate-fade-up overflow-hidden rounded-3xl border-2 bg-white text-left transition-all duration-300",
                selected
                  ? "-translate-y-1 border-primary shadow-[var(--shadow-lift)] ring-4 ring-primary/15"
                  : "border-border hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-soft)]",
              )}
            >
              <div className="border-b border-border bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={cn("h-9 w-9 shrink-0 rounded-full", TEMPLATE_TONES[index % TEMPLATE_TONES.length])} />
                    <div>
                      <h2 className="font-extrabold">Mi CV {tpl.name}</h2>
                      <p className="text-sm font-semibold text-primary">{tpl.tagline}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300",
                      selected ? "scale-100 bg-gradient-brand text-white" : "scale-75 bg-background text-transparent",
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">{tpl.description}</p>
              </div>
              <div className="max-h-80 overflow-hidden bg-background p-3">
                <ResumePreview content={content} templateId={tpl.id} scale={0.42} />
              </div>
            </button>
          );
        })}
      </div>

      <Card className="sticky bottom-4 z-10 mt-8">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
          <p className="text-sm font-semibold text-muted">Cuando confirmes el diseño, vamos a optimizar la redacción profesional.</p>
          <Button size="lg" disabled={generating} onClick={() => void create()}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Creando tu CV…" : "Crear mi CV"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
