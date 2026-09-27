import { useEffect } from "react";
import { AlertCircle, Check, Info } from "lucide-react";
import { useToastStore } from "@/stores/toastStore";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) => setTimeout(() => dismiss(t.id), 4200));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[min(100%,22rem)] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex animate-pop-in items-start gap-3 rounded-3xl border bg-white p-4 shadow-[var(--shadow-lift)]",
            t.variant === "error" && "border-peach bg-[#fff6f0]",
            t.variant === "success" && "border-mint bg-[#f2fcf7]",
          )}
        >
          <span
            className={cn(
              "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
              t.variant === "error" ? "bg-peach text-peach-strong" : t.variant === "success" ? "bg-mint text-mint-strong" : "bg-primary-soft text-primary",
            )}
          >
            {t.variant === "error" ? <AlertCircle className="h-4 w-4" /> : t.variant === "success" ? <Check className="h-4 w-4" /> : <Info className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-bold">{t.title}</div>
            {t.description ? <div className="mt-1 text-sm text-muted">{t.description}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
