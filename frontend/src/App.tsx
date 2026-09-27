import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/layouts/AppLayout";
import { Toaster } from "@/components/ui/toaster";
import { hydrateServerFromBrowser } from "@/services/apiClient";
import { LandingPage } from "@/pages/LandingPage";

const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage").then((m) => ({ default: m.OnboardingPage })));
const InterviewPage = lazy(() => import("@/pages/InterviewPage").then((m) => ({ default: m.InterviewPage })));
const ReviewPage = lazy(() => import("@/pages/ReviewPage").then((m) => ({ default: m.ReviewPage })));
const PhotoPage = lazy(() => import("@/pages/PhotoPage").then((m) => ({ default: m.PhotoPage })));
const TemplatesPage = lazy(() => import("@/pages/TemplatesPage").then((m) => ({ default: m.TemplatesPage })));
const ResumePage = lazy(() => import("@/pages/ResumePage").then((m) => ({ default: m.ResumePage })));

const queryClient = new QueryClient();

function Fallback() {
  return <div className="mx-auto max-w-lg px-4 py-20 text-center text-muted">Cargando…</div>;
}

export default function App() {
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        await hydrateServerFromBrowser();
      } catch {
        /* Si el servidor no está, igual mostramos la app. */
      }
      setBooted(true);
    })();
  }, []);

  if (!booted) {
    return <Fallback />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/interview" element={<InterviewPage />} />
              <Route path="/review" element={<ReviewPage />} />
              <Route path="/photo" element={<PhotoPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/resume/:id" element={<ResumePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
