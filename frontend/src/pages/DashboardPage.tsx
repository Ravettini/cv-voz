import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, Download, FileText, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import type { Resume } from "@cv-voz/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadResume, resumeApi } from "@/services/resumeApi";
import { toast } from "@/stores/toastStore";

const CARD_STRIPES = [
  "bg-gradient-brand",
  "bg-gradient-to-r from-mint to-sky",
  "bg-gradient-to-r from-peach to-blush",
  "bg-gradient-to-r from-butter to-peach",
];

export function DashboardPage() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const { resumes: list } = await resumeApi.list();
        setResumes(list);
      } catch (err) {
        toast({ title: "No pudimos cargar tus CV", description: err instanceof Error ? err.message : undefined, variant: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onDuplicate = async (id: string) => {
    try {
      const { resume } = await resumeApi.duplicate(id);
      setResumes((prev) => [resume, ...prev]);
      toast({ title: "CV duplicado", variant: "success" });
    } catch (err) {
      toast({ title: "No pudimos duplicar", description: err instanceof Error ? err.message : undefined, variant: "error" });
    }
  };

  const onDelete = async (id: string) => {
    try {
      await resumeApi.remove(id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "CV eliminado" });
    } catch (err) {
      toast({ title: "No pudimos eliminar", description: err instanceof Error ? err.message : undefined, variant: "error" });
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex animate-fade-up flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Mis <span className="text-gradient">CV</span>
          </h1>
          <p className="mt-2 text-muted">Abrí, editá o descargá tus currículums guardados.</p>
        </div>
        <Button asChild>
          <Link to="/onboarding">
            <Plus className="h-4 w-4" />
            Crear mi CV
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-40 rounded-3xl" />
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <Card className="animate-pop-in text-center">
          <CardHeader className="items-center pt-10">
            <span className="mx-auto mb-4 inline-flex h-16 w-16 animate-float items-center justify-center rounded-full bg-gradient-to-br from-primary-soft to-peach text-primary-strong">
              <FileText className="h-7 w-7" />
            </span>
            <CardTitle>Todavía no creaste tu primer CV</CardTitle>
            <CardDescription>Contame tu historia y lo armamos juntos en unos minutos.</CardDescription>
          </CardHeader>
          <CardContent className="pb-10">
            <Button asChild>
              <Link to="/onboarding">Crear mi CV</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {resumes.map((resume, index) => (
            <Card
              key={resume.id}
              interactive
              className="animate-fade-up overflow-hidden"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className={`h-2 ${CARD_STRIPES[index % CARD_STRIPES.length]}`} aria-hidden />
              <CardHeader>
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{resume.name}</CardTitle>
                    <CardDescription>
                      {resume.targetRole || "Sin rol objetivo"} · {resume.templateId} · actualizado{" "}
                      {new Date(resume.updatedAt).toLocaleDateString("es-AR")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => navigate(`/resume/${resume.id}`)}>
                  <FileText className="h-4 w-4" />
                  Abrir
                </Button>
                <Button size="sm" variant="mint" onClick={() => void downloadResume(resume.id, "pdf")}>
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void onDuplicate(resume.id)} aria-label="Duplicar">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void onDelete(resume.id)} aria-label="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <span className="sr-only">
                  <MoreHorizontal />
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
