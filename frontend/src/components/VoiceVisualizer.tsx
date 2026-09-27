import { Mic, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function VoiceVisualizer({
  active,
  mode,
  level = 0.3,
}: {
  active: boolean;
  mode: "user" | "assistant" | "idle";
  level?: number;
}) {
  const bars = Array.from({ length: 14 }, (_, i) => i);
  const orbScale = active ? 1 + Math.min(level, 1) * 0.12 : 1;

  return (
    <div
      className={cn(
        "relative mx-auto flex w-full max-w-md flex-col items-center gap-5 overflow-hidden rounded-[2rem] px-4 py-7 transition-colors duration-500",
        mode === "assistant" && "bg-gradient-to-br from-primary-soft via-white to-blush/60",
        mode === "user" && "bg-gradient-to-br from-mint/70 via-white to-sky/70",
        mode === "idle" && "bg-background",
      )}
      aria-hidden
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        {active ? (
          <>
            <span
              className={cn(
                "absolute inset-0 animate-pulse-ring rounded-full",
                mode === "assistant" ? "bg-primary/30" : "bg-mint-strong/25",
              )}
            />
            <span
              className={cn(
                "absolute inset-0 animate-pulse-ring rounded-full [animation-delay:1.1s]",
                mode === "assistant" ? "bg-primary/20" : "bg-mint-strong/20",
              )}
            />
          </>
        ) : null}
        <span
          className={cn(
            "relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-[var(--shadow-lift)] transition-all duration-200",
            mode === "assistant" && "bg-gradient-brand",
            mode === "user" && "bg-gradient-to-br from-[#5fcf9f] to-[#6fb6f0]",
            mode === "idle" && "bg-gradient-to-br from-[#c8c2e4] to-[#dcd7ee]",
          )}
          style={{ transform: `scale(${orbScale})` }}
        >
          {mode === "assistant" ? <Sparkles className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
        </span>
      </div>

      <div className="flex h-10 items-center justify-center gap-1">
        {bars.map((bar) => {
          const wave = active ? 0.22 + ((Math.sin(bar * 0.9 + level * 8) + 1) / 2) * (0.35 + level * 0.55) : 0.14;
          return (
            <span
              key={bar}
              className={cn(
                "w-1.5 rounded-full transition-all duration-150",
                mode === "assistant" && "bg-gradient-to-t from-primary to-[#e79bc8]",
                mode === "user" && "bg-gradient-to-t from-mint-strong to-[#6fb6f0]",
                mode === "idle" && "bg-[#d8d3ea]",
              )}
              style={{ height: `${Math.min(1, wave) * 100}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}
