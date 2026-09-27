import { Clock, Layers, Link2, MessageSquareText, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onContinue: () => void;
};

const TIPS = [
  {
    icon: MessageSquareText,
    tone: "bg-primary-soft text-primary-strong",
    title: "Explayate.",
    body: "Contá qué hacías, con qué herramientas, para quién y con qué objetivo. Los detalles cortos dejan un CV vacío.",
  },
  {
    icon: Layers,
    tone: "bg-mint text-mint-strong",
    title: "Hablá de todos tus trabajos.",
    body: "No solo del último: enumerálos y después profundizamos uno por uno.",
  },
  {
    icon: Clock,
    tone: "bg-butter text-butter-strong",
    title: "Tomate tu tiempo.",
    body: "Podés pausar, pensar y seguir. Si algo no lo recordás exacto, decilo aproximado (año, mes/año).",
  },
  {
    icon: Link2,
    tone: "bg-peach text-peach-strong",
    title: "Mencioná links",
    body: "si los tenés (LinkedIn, GitHub, portfolio): van al CV.",
  },
];

export function InterviewBriefingModal({ open, onContinue }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2b2640]/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="interview-briefing-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg animate-pop-in overflow-y-auto rounded-[2rem] border border-white/70 bg-white p-6 shadow-[var(--shadow-lift)] sm:p-8">
        <div className="relative mb-5 flex h-14 w-14 items-center justify-center">
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-mint" aria-hidden />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-mint text-mint-strong">
            <Wind className="h-6 w-6" aria-hidden />
          </span>
        </div>
        <h2 id="interview-briefing-title" className="text-2xl font-extrabold tracking-tight text-text">
          Antes de empezar: <span className="text-gradient">respirá hondo</span>
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Cuanto más completo cuentes tu recorrido, mejor va a quedar tu CV. No hace falta sonar “profesional”: hace
          falta <span className="font-bold text-text">explicarte bien</span>.
        </p>

        <ul className="mt-5 space-y-2.5 text-sm leading-relaxed text-text">
          {TIPS.map((tip, index) => {
            const Icon = tip.icon;
            return (
              <li
                key={tip.title}
                className="flex animate-fade-up items-start gap-3 rounded-2xl bg-background px-4 py-3"
                style={{ animationDelay: `${120 + index * 80}ms` }}
              >
                <span className={cn("mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full", tip.tone)}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <strong className="font-extrabold">{tip.title}</strong> {tip.body}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="mt-5 text-sm text-muted">Después vas a poder revisar y editar todo antes de generar el CV.</p>

        <Button className="mt-6 w-full" size="lg" onClick={onContinue}>
          Entendido, estoy listo/a
        </Button>
      </div>
    </div>
  );
}
