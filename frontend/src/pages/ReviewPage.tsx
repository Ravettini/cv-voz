import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Award,
  Briefcase,
  Check,
  GraduationCap,
  Languages,
  Link2,
  Loader2,
  Plus,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";
import type { Experience, Language } from "@cv-voz/shared";
import { ProcessStepper } from "@/components/ProcessStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { profileApi } from "@/services/profileApi";
import { useCandidateProfileStore } from "@/stores/candidateProfileStore";
import { toast } from "@/stores/toastStore";

const SECTION_META: Record<string, { icon: LucideIcon; tone: string; stripe: string }> = {
  Experiencia: { icon: Briefcase, tone: "bg-mint text-mint-strong", stripe: "bg-gradient-to-r from-mint to-sky" },
  Educación: { icon: GraduationCap, tone: "bg-sky text-sky-strong", stripe: "bg-gradient-to-r from-sky to-primary-soft" },
  Cursos: { icon: Award, tone: "bg-butter text-butter-strong", stripe: "bg-gradient-to-r from-butter to-peach" },
  Habilidades: { icon: Sparkles, tone: "bg-peach text-peach-strong", stripe: "bg-gradient-to-r from-peach to-blush" },
  Idiomas: { icon: Languages, tone: "bg-primary-soft text-primary-strong", stripe: "bg-gradient-to-r from-primary-soft to-mint" },
  Links: { icon: Link2, tone: "bg-blush text-[#a83c6c]", stripe: "bg-gradient-to-r from-blush to-primary-soft" },
  default: { icon: Sparkles, tone: "bg-primary-soft text-primary-strong", stripe: "bg-gradient-brand" },
};

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-muted">{label}</span>
      {multiline ? (
        <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

export function ReviewPage() {
  const navigate = useNavigate();
  const { profile, setProfile, updateProfile } = useCandidateProfileStore();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!profile);

  useEffect(() => {
    if (profile) return;
    void (async () => {
      try {
        const { profile: loaded } = await profileApi.get();
        setProfile(loaded);
      } catch (err) {
        toast({
          title: "Todavía no hay información para revisar",
          description: err instanceof Error ? err.message : undefined,
          variant: "error",
        });
        navigate("/onboarding");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate, profile, setProfile]);

  const saveAndContinue = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { profile: saved } = await profileApi.update(profile);
      setProfile(saved);
      navigate("/photo");
    } catch (err) {
      toast({ title: "No pudimos guardar", description: err instanceof Error ? err.message : undefined, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="skeleton h-40 rounded-3xl" />
      </div>
    );
  }

  const p = profile;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <ProcessStepper current={2} />
      <div className="mb-8 animate-fade-up">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Esto es lo que entendí <span className="text-gradient">sobre vos</span>
        </h1>
        <p className="mt-2 text-muted">Revisá la información antes de crear tu CV. Podés modificar todo.</p>
      </div>

      <div className="space-y-5">
        <Card className="animate-fade-up overflow-hidden">
          <div className="h-1.5 bg-gradient-brand" aria-hidden />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
                <User className="h-4 w-4" />
              </span>
              Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre" value={p.personal.fullName} onChange={(v) => updateProfile((c) => ({ ...c, personal: { ...c.personal, fullName: v } }))} />
            <Field label="Objetivo" value={p.target.desiredRole} onChange={(v) => updateProfile((c) => ({ ...c, target: { ...c.target, desiredRole: v } }))} />
            <div className="sm:col-span-2">
              <Field
                label="Resumen"
                multiline
                value={p.professionalSummary}
                onChange={(v) => updateProfile((c) => ({ ...c, professionalSummary: v }))}
              />
            </div>
            <Field label="Ciudad" value={p.personal.city} onChange={(v) => updateProfile((c) => ({ ...c, personal: { ...c.personal, city: v } }))} />
            <Field label="Email" value={p.personal.email} onChange={(v) => updateProfile((c) => ({ ...c, personal: { ...c.personal, email: v } }))} />
            <Field label="Teléfono" value={p.personal.phone} onChange={(v) => updateProfile((c) => ({ ...c, personal: { ...c.personal, phone: v } }))} />
          </CardContent>
        </Card>

        <Section
          title="Experiencia"
          onAdd={() =>
            updateProfile((c) => ({
              ...c,
              experiences: [
                ...c.experiences,
                {
                  id: crypto.randomUUID(),
                  company: "Nueva empresa",
                  role: "Puesto",
                  current: false,
                  responsibilities: [],
                  achievements: [],
                  tools: [],
                },
              ],
            }))
          }
        >
          {p.experiences.map((exp, idx) => (
            <ExperienceEditor
              key={exp.id}
              experience={exp}
              onChange={(next) =>
                updateProfile((c) => {
                  const experiences = [...c.experiences];
                  experiences[idx] = next;
                  return { ...c, experiences };
                })
              }
            />
          ))}
        </Section>

        <Section
          title="Educación"
          onAdd={() =>
            updateProfile((c) => ({
              ...c,
              education: [...c.education, { id: crypto.randomUUID(), institution: "Institución" }],
            }))
          }
        >
          {p.education.map((edu, idx) => (
            <div key={edu.id} className="grid gap-3 rounded-2xl border border-border bg-background/60 p-4 sm:grid-cols-2">
              <Field
                label="Institución"
                value={edu.institution}
                onChange={(v) =>
                  updateProfile((c) => {
                    const education = [...c.education];
                    education[idx] = { ...edu, institution: v };
                    return { ...c, education };
                  })
                }
              />
              <Field
                label="Carrera / título"
                value={[edu.degree, edu.field].filter(Boolean).join(" · ")}
                onChange={(v) =>
                  updateProfile((c) => {
                    const education = [...c.education];
                    education[idx] = { ...edu, field: v };
                    return { ...c, education };
                  })
                }
              />
            </div>
          ))}
        </Section>

        <Section
          title="Cursos"
          onAdd={() =>
            updateProfile((c) => ({
              ...c,
              courses: [...c.courses, { id: crypto.randomUUID(), name: "Nuevo curso" }],
            }))
          }
        >
          {p.courses.map((course, idx) => (
            <Field
              key={course.id}
              label="Curso"
              value={course.name}
              onChange={(v) =>
                updateProfile((c) => {
                  const courses = [...c.courses];
                  courses[idx] = { ...course, name: v };
                  return { ...c, courses };
                })
              }
            />
          ))}
        </Section>

        <Section
          title="Habilidades"
          onAdd={() =>
            updateProfile((c) => ({
              ...c,
              skills: [...c.skills, { id: crypto.randomUUID(), name: "Nueva habilidad" }],
            }))
          }
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {p.skills.map((skill, idx) => (
              <Field
                key={skill.id}
                label="Habilidad"
                value={skill.name}
                onChange={(v) =>
                  updateProfile((c) => {
                    const skills = [...c.skills];
                    skills[idx] = { ...skill, name: v };
                    return { ...c, skills };
                  })
                }
              />
            ))}
          </div>
        </Section>

        <Section title="Idiomas" onAdd={() => updateProfile((c) => ({ ...c, languages: [...c.languages, { id: crypto.randomUUID(), language: "Idioma", level: "intermedio" }] }))}>
          {p.languages.map((lang, idx) => (
            <div key={lang.id} className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Idioma"
                value={lang.language}
                onChange={(v) =>
                  updateProfile((c) => {
                    const languages = [...c.languages];
                    languages[idx] = { ...lang, language: v };
                    return { ...c, languages };
                  })
                }
              />
              <Field
                label="Nivel"
                value={lang.level}
                onChange={(v) =>
                  updateProfile((c) => {
                    const languages = [...c.languages];
                    languages[idx] = { ...lang, level: v as Language["level"] };
                    return { ...c, languages };
                  })
                }
              />
            </div>
          ))}
        </Section>

        <Section title="Links" onAdd={() => updateProfile((c) => ({ ...c, links: [...c.links, { id: crypto.randomUUID(), label: "LinkedIn", url: "" }] }))}>
          {p.links.map((link, idx) => (
            <div key={link.id} className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Etiqueta"
                value={link.label}
                onChange={(v) =>
                  updateProfile((c) => {
                    const links = [...c.links];
                    links[idx] = { ...link, label: v };
                    return { ...c, links };
                  })
                }
              />
              <Field
                label="URL"
                value={link.url}
                onChange={(v) =>
                  updateProfile((c) => {
                    const links = [...c.links];
                    links[idx] = { ...link, url: v };
                    return { ...c, links };
                  })
                }
              />
            </div>
          ))}
        </Section>
      </div>

      <div className="sticky bottom-4 z-10 mt-8">
        <Button size="lg" className="w-full sm:w-auto" disabled={saving} onClick={() => void saveAndContinue()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? "Guardando…" : "Todo está correcto"}
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  onAdd,
}: {
  title: string;
  children: React.ReactNode;
  onAdd: () => void;
}) {
  const meta = SECTION_META[title] ?? SECTION_META.default;
  const Icon = meta.icon;
  return (
    <Card className="animate-fade-up overflow-hidden">
      <div className={cn("h-1.5", meta.stripe)} aria-hidden />
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full", meta.tone)}>
            <Icon className="h-4 w-4" />
          </span>
          {title}
        </CardTitle>
        <Button variant="secondary" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function ExperienceEditor({
  experience,
  onChange,
}: {
  experience: Experience;
  onChange: (next: Experience) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Empresa" value={experience.company} onChange={(v) => onChange({ ...experience, company: v })} />
        <Field label="Cargo" value={experience.role} onChange={(v) => onChange({ ...experience, role: v })} />
        <Field label="Inicio" value={experience.startDate} onChange={(v) => onChange({ ...experience, startDate: v })} />
        <Field label="Fin" value={experience.endDate} onChange={(v) => onChange({ ...experience, endDate: v })} />
      </div>
      <Field
        label="Responsabilidades (una por línea)"
        multiline
        value={experience.responsibilities.join("\n")}
        onChange={(v) => onChange({ ...experience, responsibilities: v.split("\n").map((s) => s.trim()).filter(Boolean) })}
      />
      <Field
        label="Logros (una por línea)"
        multiline
        value={experience.achievements.join("\n")}
        onChange={(v) => onChange({ ...experience, achievements: v.split("\n").map((s) => s.trim()).filter(Boolean) })}
      />
      <Field
        label="Herramientas (separadas por coma)"
        value={experience.tools.join(", ")}
        onChange={(v) => onChange({ ...experience, tools: v.split(",").map((s) => s.trim()).filter(Boolean) })}
      />
    </div>
  );
}
