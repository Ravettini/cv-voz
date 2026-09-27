import { Link } from "react-router-dom";
import { Heart, Keyboard, Mic, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProcessStepper } from "@/components/ProcessStepper";

export function OnboardingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <ProcessStepper current={1} />
      <Card className="relative animate-fade-up overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-soft blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-mint/70 blur-2xl" aria-hidden />
        <CardContent className="relative space-y-7 p-8 sm:p-10">
          <div>
            <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-[var(--shadow-soft)]">
              <Sparkles className="h-6 w-6" />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Creemos tu CV <span className="text-gradient">juntos</span>
            </h1>
            <div className="mt-5 space-y-3 text-base leading-relaxed text-muted">
              <p className="animate-fade-up [animation-delay:80ms]">No necesitás saber cómo escribir un currículum ni preparar nada antes.</p>
              <p className="animate-fade-up [animation-delay:140ms]">
                Te voy a hacer algunas preguntas sobre vos, tu experiencia, tus estudios y lo que sabés hacer.
              </p>
              <p className="animate-fade-up [animation-delay:200ms]">
                No existe una forma correcta de responder. Hablá naturalmente y contame las cosas como las recordarías.
              </p>
              <p className="animate-fade-up font-semibold text-text [animation-delay:260ms]">Yo voy a ayudarte a ordenarlas.</p>
            </div>
          </div>

          <div className="flex animate-fade-up flex-col gap-3 [animation-delay:320ms] sm:flex-row">
            <Button asChild size="lg" className="flex-1">
              <Link to="/interview?mode=voice">
                <Mic className="h-4 w-4" />
                Comenzar entrevista
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="flex-1">
              <Link to="/interview?mode=text">
                <Keyboard className="h-4 w-4" />
                Prefiero escribir
              </Link>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <p className="flex items-start gap-2 rounded-2xl bg-mint/50 px-4 py-3 text-sm font-semibold text-mint-strong">
              <Heart className="mt-0.5 h-4 w-4 shrink-0" />
              Podés revisar y modificar toda la información antes de generar tu CV.
            </p>
            <p className="flex items-start gap-2 rounded-2xl bg-primary-soft/70 px-4 py-3 text-sm font-semibold text-primary-strong">
              <Shield className="mt-0.5 h-4 w-4 shrink-0" />
              Vos decidís qué información incluir en tu CV.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
