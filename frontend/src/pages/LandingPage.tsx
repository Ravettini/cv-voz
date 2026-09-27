import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ClipboardCheck, Download, FileText, HardDrive, Loader2, MessageCircle, Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/services/apiClient";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";

const STEPS = [
  {
    title: "Conversás",
    body: "Una entrevista natural por voz o texto. Sin campos obligatorios ni jerga de RR.HH.",
    icon: Mic,
    tone: "bg-primary-soft text-primary-strong",
  },
  {
    title: "Revisás",
    body: "Ves lo que entendimos, corregís lo que haga falta y sumás una foto si querés.",
    icon: ClipboardCheck,
    tone: "bg-mint text-mint-strong",
  },
  {
    title: "Descargás",
    body: "Elegís un diseño, obtenés vista previa A4 y bajás PDF o Word.",
    icon: Download,
    tone: "bg-peach text-peach-strong",
  },
];

function HeroArt() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm animate-pop-in [animation-delay:200ms]" aria-hidden>
      <div className="absolute inset-8 rounded-full bg-gradient-to-br from-primary-soft via-blush to-peach opacity-80 blur-2xl" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex h-40 w-40 items-center justify-center">
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/25" />
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/20 [animation-delay:0.8s]" />
          <span className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-brand text-white shadow-[var(--shadow-lift)]">
            <Mic className="h-10 w-10" />
          </span>
        </div>
      </div>

      <div className="absolute left-0 top-8 animate-float rounded-3xl bg-white/95 p-3 shadow-[var(--shadow-lift)]">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-mint text-mint-strong">
            <MessageCircle className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-bold text-text">¿Dónde trabajaste?</span>
        </div>
      </div>

      <div className="absolute bottom-6 right-0 w-40 animate-float-slow rounded-3xl bg-white/95 p-3 shadow-[var(--shadow-lift)] [animation-delay:-2s]">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-peach text-peach-strong">
            <FileText className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-bold">Tu CV</span>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 w-4/5 rounded-full bg-primary-soft" />
          <div className="h-2 w-full rounded-full bg-mint/80" />
          <div className="h-2 w-3/5 rounded-full bg-peach/80" />
        </div>
      </div>

      <div className="absolute right-6 top-2 animate-float rounded-full bg-butter px-3 py-1 text-xs font-bold text-butter-strong shadow-sm [animation-delay:-4s]">
        <Sparkles className="mr-1 inline h-3 w-3" />1 hoja A4
      </div>
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const [seeding, setSeeding] = useState(false);
  const openSampleCv = async () => {
    setSeeding(true);
    try {
      const result = await apiFetch<{ resumeId: string }>("/api/dev/seed-demo", { method: "POST" });
      navigate(`/resume/${result.resumeId}`);
    } catch (err) {
      toast({
        title: "No pudimos armar el CV de prueba",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div className="text-center lg:text-left">
          <p className="mb-4 inline-flex animate-fade-up items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-sm font-bold text-primary-strong shadow-sm">
            <Sparkles className="h-4 w-4" />
            CV profesional sin formularios
          </p>
          <h1 className="animate-fade-up text-4xl font-extrabold leading-[1.08] tracking-tight text-text [animation-delay:80ms] sm:text-6xl">
            Creemos tu CV <span className="text-gradient">juntos</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl animate-fade-up text-base leading-relaxed text-muted [animation-delay:160ms] sm:text-lg lg:mx-0">
            Contame tu historia. Yo me encargo de convertirla en un CV claro, profesional y fácil de leer.
          </p>
          <p className="mx-auto mt-4 inline-flex max-w-xl animate-fade-up items-center gap-2 rounded-2xl bg-butter/70 px-3 py-2 text-sm font-semibold text-butter-strong [animation-delay:220ms] lg:mx-0">
            <HardDrive className="h-4 w-4 shrink-0" />
            Todo queda en este navegador. Si lo abrís en otro, empezás de cero.
          </p>
          <div className="mt-8 flex animate-fade-up flex-wrap items-center justify-center gap-3 [animation-delay:280ms] lg:justify-start">
            <Button asChild size="lg" className="group">
              <Link to="/onboarding">
                Empezar
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button size="lg" variant="mint" disabled={seeding} onClick={() => void openSampleCv()}>
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {seeding ? "Armando CV de prueba…" : "Ver CV de prueba"}
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/dashboard">Mis CV</Link>
            </Button>
          </div>
        </div>
        <HeroArt />
      </div>

      <div className="mt-16 grid gap-5 md:grid-cols-3">
        {STEPS.map((item, index) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.title}
              interactive
              className="group animate-fade-up"
              style={{ animationDelay: `${380 + index * 110}ms` }}
            >
              <CardContent className="pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className={cn("inline-flex rounded-2xl p-3 transition-transform group-hover:animate-wiggle", item.tone)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-3xl font-extrabold text-primary-soft">0{index + 1}</span>
                </div>
                <h2 className="text-lg font-extrabold">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
