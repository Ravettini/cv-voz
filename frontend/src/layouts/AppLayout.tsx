import { Link, Outlet } from "react-router-dom";
import { FolderOpen, HardDrive, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppLayout() {
  return (
    <div className="relative min-h-screen">
      <div className="bg-blobs" aria-hidden>
        <span />
      </div>
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/85 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-white shadow-[var(--shadow-soft)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
              <Mic className="h-4 w-4" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              CV <span className="text-gradient">Voz</span>
            </span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard">
              <FolderOpen className="h-4 w-4" />
              Mis CV
            </Link>
          </Button>
        </div>
      </header>
      <div className="flex justify-center px-4 pt-4">
        <div className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-butter bg-butter/80 px-4 py-1.5 text-center text-xs font-semibold text-butter-strong shadow-sm sm:text-sm">
          <HardDrive className="h-4 w-4 shrink-0" />
          La entrevista y los CV se guardan en este navegador. No hay cuenta.
        </div>
      </div>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
