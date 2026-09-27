import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, Download, Loader2, Pencil, LayoutTemplate } from "lucide-react";
import { TEMPLATES, type ResumeWithContent, type TemplateId } from "@cv-voz/shared";
import { ProcessStepper } from "@/components/ProcessStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResumePreview } from "@/features/templates/templates";
import { cn } from "@/lib/utils";
import { downloadResume, resumeApi } from "@/services/resumeApi";
import { useResumeBuilderStore } from "@/stores/resumeBuilderStore";
import { toast } from "@/stores/toastStore";

const TEMPLATE_DOTS = ["bg-primary-soft", "bg-mint", "bg-peach", "bg-sky"];

export function ResumePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { resume, setResume, setSelectedTemplate } = useResumeBuilderStore();
  const [loading, setLoading] = useState(!resume || resume.id !== id);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<"pdf" | "docx" | null>(null);

  useEffect(() => {
    if (!id) return;
    if (resume && resume.id === id && "content" in resume) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const { resume: loaded } = await resumeApi.get(id);
        if (!("content" in loaded)) {
          const generated = await resumeApi.generate(id);
          setResume(generated.resume);
        } else {
          setResume(loaded as ResumeWithContent);
        }
      } catch (err) {
        toast({
          title: "No pudimos cargar el CV",
          description: err instanceof Error ? err.message : undefined,
          variant: "error",
        });
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate, resume, setResume]);

  const changeTemplate = async (templateId: TemplateId) => {
    if (!id) return;
    setBusy(true);
    try {
      const { resume: updated } = await resumeApi.changeTemplate(id, templateId);
      if ("content" in updated) setResume(updated as ResumeWithContent);
      setSelectedTemplate(templateId);
      toast({ title: "Diseño actualizado", variant: "success" });
    } catch (err) {
      toast({ title: "No pudimos cambiar el diseño", description: err instanceof Error ? err.message : undefined, variant: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (loading || !resume || !("content" in resume)) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="skeleton h-64 rounded-3xl" />
        <p className="mt-4 flex items-center justify-center gap-2 text-center text-sm font-semibold text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Preparando tu CV…
        </p>
      </div>
    );
  }

  const score = resume.atsScore;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <ProcessStepper current={5} />
      <div className="mb-8 flex animate-fade-up flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Tu CV está <span className="text-gradient">listo</span>
          </h1>
          <p className="mt-2 text-muted">Podés descargarlo, editar la información o cambiar el diseño sin regenerar todo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={busy}
            onClick={() =>
              void (async () => {
                setBusy(true);
                setDownloading("pdf");
                try {
                  await downloadResume(resume, "pdf");
                } catch (err) {
                  toast({
                    title: "No pudimos descargar el PDF",
                    description: err instanceof Error ? err.message : undefined,
                    variant: "error",
                  });
                } finally {
                  setBusy(false);
                  setDownloading(null);
                }
              })()
            }
          >
            {downloading === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {downloading === "pdf" ? "Generando PDF…" : "Descargar PDF"}
          </Button>
          <Button
            variant="mint"
            disabled={busy}
            onClick={() =>
              void (async () => {
                setBusy(true);
                setDownloading("docx");
                try {
                  await downloadResume(resume, "docx");
                } catch (err) {
                  toast({
                    title: "No pudimos descargar el Word",
                    description: err instanceof Error ? err.message : undefined,
                    variant: "error",
                  });
                } finally {
                  setBusy(false);
                  setDownloading(null);
                }
              })()
            }
          >
            {downloading === "docx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {downloading === "docx" ? "Generando Word…" : "Descargar Word"}
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/review">
              <Pencil className="h-4 w-4" />
              Editar información
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          "Información organizada",
          "Redacción optimizada",
          "Estructura profesional",
          "CV preparado",
        ].map((item, index) => (
          <div
            key={item}
            className="flex animate-fade-up items-center gap-2 rounded-2xl border border-mint bg-mint/40 px-4 py-3 text-sm font-bold text-mint-strong"
            style={{ animationDelay: `${100 + index * 90}ms` }}
          >
            <span
              className="inline-flex h-6 w-6 animate-pop-in items-center justify-center rounded-full bg-mint-strong text-white"
              style={{ animationDelay: `${260 + index * 90}ms` }}
            >
              <Check className="h-3.5 w-3.5" />
            </span>
            {item}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="animate-fade-up [animation-delay:200ms]">
          <ResumePreview content={resume.content} templateId={resume.templateId} scale={0.78} />
        </div>

        <div className="space-y-4">
          <Card className="animate-fade-up [animation-delay:260ms]">
            <CardHeader>
              <CardTitle className="text-base">Preparación del CV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-4xl font-extrabold">
                <span className="text-gradient">{score.overall}</span>
                <span className="text-xl text-muted"> / 100</span>
              </div>
              <p className="text-xs text-muted">
                Estimación basada en buenas prácticas de legibilidad y estructura de CV.
              </p>
              {[
                ["Contenido", score.content, "bg-gradient-brand"],
                ["Claridad", score.clarity, "bg-gradient-to-r from-[#5fcf9f] to-[#6fb6f0]"],
                ["Compatibilidad ATS", score.atsCompatibility, "bg-gradient-to-r from-[#f7b58f] to-[#f59bb8]"],
                ["Información profesional", score.professionalInfo, "bg-gradient-to-r from-[#f4c95d] to-[#f7b58f]"],
              ].map(([label, value, tone], index) => (
                <div key={String(label)}>
                  <div className="mb-1 flex justify-between text-xs font-semibold">
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-background">
                    <div
                      className={`h-full origin-left animate-grow-x rounded-full ${tone}`}
                      style={{ width: `${value}%`, animationDelay: `${400 + index * 120}ms` }}
                    />
                  </div>
                </div>
              ))}
              {score.suggestions.length ? (
                <div className="space-y-2 pt-2">
                  {score.suggestions.map((s) => (
                    <div key={s} className="rounded-2xl bg-butter/70 px-3 py-2 text-xs font-semibold text-butter-strong">
                      {s}
                      <div className="mt-2">
                        <Button asChild size="sm" variant="secondary">
                          <Link to="/review">Completar información</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="animate-fade-up [animation-delay:340ms]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LayoutTemplate className="h-4 w-4 text-primary" />
                Cambiar diseño
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {TEMPLATES.map((tpl, index) => {
                const selected = resume.templateId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void changeTemplate(tpl.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-full border px-3 py-2 text-left text-sm font-bold transition-all duration-200 disabled:opacity-60",
                      selected
                        ? "border-transparent bg-gradient-brand text-white shadow-[var(--shadow-soft)]"
                        : "border-border bg-white hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-soft)]",
                    )}
                  >
                    <span
                      className={cn(
                        "h-5 w-5 shrink-0 rounded-full",
                        selected ? "bg-white/40" : TEMPLATE_DOTS[index % TEMPLATE_DOTS.length],
                      )}
                    />
                    {tpl.name}
                    {selected ? <Check className="ml-auto h-4 w-4" /> : null}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Button asChild variant="secondary" className="w-full">
            <Link to="/dashboard">Ir al dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
