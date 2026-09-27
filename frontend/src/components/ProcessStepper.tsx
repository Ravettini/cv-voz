import { Check } from "lucide-react";
import { PROCESS_STEPS } from "@cv-voz/shared";
import { cn } from "@/lib/utils";

export function ProcessStepper({ current }: { current: number }) {
  const total = PROCESS_STEPS.length;
  const progress = total > 1 ? Math.min(1, Math.max(0, (current - 1) / (total - 1))) : 1;

  return (
    <nav aria-label="Progreso" className="mx-auto mb-10 w-full max-w-3xl animate-fade-up">
      <div className="relative mx-6 mb-3 hidden h-1.5 overflow-hidden rounded-full bg-primary-soft sm:block">
        <div
          className="h-full origin-left animate-grow-x rounded-full bg-gradient-brand transition-[width] duration-700 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <ol className="flex flex-wrap items-center justify-center gap-2 sm:justify-between sm:gap-3">
        {PROCESS_STEPS.map((step) => {
          const active = step.id === current;
          const done = step.id < current;
          return (
            <li
              key={step.id}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300 sm:text-sm",
                active && "bg-white text-primary-strong shadow-[var(--shadow-soft)]",
                done && "text-mint-strong",
                !active && !done && "text-muted",
              )}
            >
              <span
                className={cn(
                  "relative inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold",
                  active && "bg-gradient-brand text-white",
                  done && "bg-mint text-mint-strong",
                  !active && !done && "bg-white text-muted ring-1 ring-border",
                )}
              >
                {active ? (
                  <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/40" aria-hidden />
                ) : null}
                <span className="relative">{done ? <Check className="h-3.5 w-3.5" /> : step.id}</span>
              </span>
              <span>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
