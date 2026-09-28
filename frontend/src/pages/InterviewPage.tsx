import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Keyboard, Link2, Loader2, MessageCircle, Mic, MicOff, Pause, Play, Plus, Send, Square, Trash2 } from "lucide-react";
import { ProcessStepper } from "@/components/ProcessStepper";
import { InterviewBriefingModal } from "@/components/InterviewBriefingModal";
import { VoiceVisualizer } from "@/components/VoiceVisualizer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createPcmPlayer, createSpeechGate, analyzeVoiceFrame, floatTo16BitPcmBase64 } from "@/features/live/audio";
import { GeminiLiveProvider } from "@/features/live/GeminiLiveProvider";
import { cn } from "@/lib/utils";
import { rememberLocalSegment } from "@/lib/browserCache";
import { interviewApi } from "@/services/interviewApi";
import { useCandidateProfileStore } from "@/stores/candidateProfileStore";
import { useInterviewStore } from "@/stores/interviewStore";
import { toast } from "@/stores/toastStore";

const STATE_LABEL: Record<string, string> = {
  idle: "Listo",
  connecting: "Conectando…",
  listening: "Escuchando…",
  thinking: "Te escuché, pensando…",
  speaking: "Te está hablando…",
  paused: "Pausado",
  error: "Reintentá la conexión",
};

const LINK_ASK_RE =
  /linkedin|portfolio|github|behance|alg[uú]n link|algun link|link(?:s)? que|perfil de linkedin|sitio web/i;
const LINK_YES_PROMPT_RE = /incluilos ac[aá]|incluílos ac[aá]|bueno!?\s*inclu|pegá(?:los)? ac[aá]|agregalos ac[aá]/i;
const USER_YES_RE = /^(sí|si|dale|ok|okay|claro|quiero|vamos|perfecto|bueno)\b/i;
const DONE_MARKER = "[[ENTREVISTA_LISTA]]";
const DONE_RE =
  /\[\[ENTREVISTA_LISTA\]\]|ya tengo (?:todo|suficiente)|cerramos la entrevista|vamos a revisar|con esto (?:alcanza|cerramos)|sintetiz|síntesis breve/i;

type DraftLink = { id: string; label: string; url: string };

function detectLinksPrompt(text: string): boolean {
  return LINK_ASK_RE.test(text) || LINK_YES_PROMPT_RE.test(text);
}

function detectInterviewDone(text: string): boolean {
  return DONE_RE.test(text);
}

function stripDoneMarker(text: string): string {
  return text.replace(DONE_MARKER, "").trim();
}

export function InterviewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preferredMode = params.get("mode") === "text" ? "text" : "voice";

  const {
    session,
    segments,
    uiState,
    liveText,
    caption,
    mode,
    error,
    setSession,
    setSegments,
    addSegment,
    setUiState,
    setLiveText,
    setCaption,
    setMode,
    setError,
  } = useInterviewStore();
  const setProfile = useCandidateProfileStore((s) => s.setProfile);

  const [micAllowed, setMicAllowed] = useState<boolean | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const [level, setLevel] = useState(0.2);
  const [showLinksPanel, setShowLinksPanel] = useState(false);
  const [linksExpanded, setLinksExpanded] = useState(false);
  const [draftLinks, setDraftLinks] = useState<DraftLink[]>([
    { id: crypto.randomUUID(), label: "LinkedIn", url: "" },
  ]);
  const [briefingOpen, setBriefingOpen] = useState(true);
  const [briefingReady, setBriefingReady] = useState(false);

  const providerRef = useRef<GeminiLiveProvider | null>(null);
  const playerRef = useRef<ReturnType<typeof createPcmPlayer> | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pendingUser = useRef("");
  const pendingAssistant = useRef("");
  const autoFinalizeStarted = useRef(false);
  const awaitingLinkDecision = useRef(false);
  const finalizeRef = useRef<() => Promise<void>>(async () => undefined);
  const speechGateRef = useRef(createSpeechGate({ startFrames: 2, hangoverMs: 1600, frameMs: 256 }));

  useEffect(() => {
    setMode(preferredMode);
  }, [preferredMode, setMode]);

  const persistSegment = useCallback(
    async (role: "user" | "assistant", text: string) => {
      const clean = text.trim();
      if (!session || !clean) return;
      const local = {
        id: crypto.randomUUID(),
        sessionId: session.id,
        role,
        text: clean,
        sequence: useInterviewStore.getState().segments.length,
        createdAt: new Date().toISOString(),
      };
      addSegment(local);
      rememberLocalSegment(local);
      try {
        await interviewApi.addSegments(session.id, [{ role, text: clean }]);
      } catch {
        /* La copia del navegador ya quedó. El servidor se rehidrata en el próximo pedido. */
      }
    },
    [addSegment, session],
  );

  const stopMic = useCallback(() => {
    try {
      processorRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    processorRef.current = null;
    mediaRef.current?.getTracks().forEach((t) => t.stop());
    mediaRef.current = null;
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
  }, []);

  const disconnectLive = useCallback(() => {
    providerRef.current?.disconnect();
    providerRef.current = null;
    playerRef.current?.stop();
    playerRef.current = null;
    stopMic();
  }, [stopMic]);

  const handleAssistantText = useCallback(
    (text: string, final: boolean) => {
      const clean = stripDoneMarker(text);
      setCaption(clean);
      setUiState("speaking");

      if (detectLinksPrompt(text)) {
        setShowLinksPanel(true);
        awaitingLinkDecision.current = true;
        if (LINK_YES_PROMPT_RE.test(text)) {
          setLinksExpanded(true);
        }
      }

      if (final) {
        pendingAssistant.current = clean;
        void persistSegment("assistant", clean);
        if (detectInterviewDone(text) && !autoFinalizeStarted.current) {
          autoFinalizeStarted.current = true;
          toast({ title: "Listo. Organizando tu información…", variant: "success" });
          window.setTimeout(() => {
            void finalizeRef.current();
          }, 2200);
        }
      }
    },
    [persistSegment, setCaption, setUiState],
  );

  const handleUserText = useCallback(
    (text: string, final: boolean) => {
      setLiveText(text);
      setUiState("listening");
      if (!final) return;

      pendingUser.current = text;
      void persistSegment("user", text);
      setLiveText("");
      setUiState("thinking");

      if (awaitingLinkDecision.current && USER_YES_RE.test(text.trim())) {
        setShowLinksPanel(true);
        setLinksExpanded(true);
        awaitingLinkDecision.current = false;
      }
      if (/^(no|nop|no gracias|ahora no)\b/i.test(text.trim())) {
        awaitingLinkDecision.current = false;
      }
    },
    [persistSegment, setLiveText, setUiState],
  );

  const startMic = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });
    mediaRef.current = stream;
    setMicAllowed(true);
    const audioCtx = new AudioContext({ sampleRate: 16000 });
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;
    source.connect(processor);
    // El procesador tiene que estar conectado para emitir frames, pero no hay que
    // devolver el micrófono a los parlantes: ese eco deja el turno abierto para siempre.
    const mute = audioCtx.createGain();
    mute.gain.value = 0;
    processor.connect(mute);
    mute.connect(audioCtx.destination);
    speechGateRef.current.reset();

    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const analysis = analyzeVoiceFrame(input);
      setLevel(Math.min(1, analysis.rms * 8));

      const provider = providerRef.current;
      if (!provider || provider.isAssistantSpeaking() || !provider.isMicEnabled()) {
        speechGateRef.current.reset();
        return;
      }

      // Voz real, o silencio digital si es ruido. El silencio es lo que cierra el turno.
      const wasOpen = speechGateRef.current.isOpen();
      const voiced = speechGateRef.current.push(analysis);
      if (voiced) {
        provider.sendAudio(floatTo16BitPcmBase64(input));
        return;
      }
      if (wasOpen) provider.endUtterance();
    };
  }, []);

  const connectLive = useCallback(async () => {
    setUiState("connecting");
    setError(null);
    playerRef.current = createPcmPlayer(24000);
    const provider = new GeminiLiveProvider({
      onOpen: () => setUiState("speaking"),
      onClose: () => setUiState("error"),
      onError: (message) => {
        setError(message);
        setUiState("error");
        toast({ title: message, variant: "error" });
      },
      onUserTranscript: handleUserText,
      onAssistantTranscript: handleAssistantText,
      onAudio: (base64) => {
        void playerRef.current?.playBase64(base64);
      },
      onSpeakingChange: (speaking) => setUiState(speaking ? "speaking" : "listening"),
      onReadyForUser: () => setUiState("listening"),
    });
    providerRef.current = provider;
    try {
      await provider.connect();
      // Mientras llega el saludo, no pasar a "escuchando".
      setUiState("speaking");
    } catch (err) {
      providerRef.current = null;
      const message = err instanceof Error ? err.message : "No pudimos conectar la voz.";
      setError(message);
      setUiState("error");
      toast({ title: message, variant: "error" });
      throw err;
    }
  }, [handleAssistantText, handleUserText, setError, setUiState]);

  useEffect(() => {
    if (!briefingReady) return;
    let cancelled = false;
    void (async () => {
      try {
        if (session) {
          try {
            const data = await interviewApi.get(session.id);
            const localCount = useInterviewStore.getState().segments.length;
            if (!cancelled && data.segments.length >= localCount) {
              setSession(data.session);
              setSegments(data.segments);
            }
          } catch {
            /* Seguimos con lo que ya está en este navegador. */
          }
          return;
        }
        const created = await interviewApi.create();
        if (cancelled) return;
        setSession(created.session);
        setSegments(created.segments);
        setCaption(created.opening);
      } catch (err) {
        toast({
          title: "No pudimos preparar la entrevista",
          description: err instanceof Error ? err.message : undefined,
          variant: "error",
        });
      }
    })();
    return () => {
      cancelled = true;
      disconnectLive();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefingReady]);

  const acceptBriefing = () => {
    setBriefingOpen(false);
    setBriefingReady(true);
  };

  const requestMic = async () => {
    try {
      // Pedimos el mic primero, pero no se envía audio hasta que termine el saludo.
      await startMic();
      await connectLive();
    } catch {
      setMicAllowed(false);
      setMode("text");
      toast({
        title: "No hay problema. Podés continuar escribiendo.",
        variant: "default",
      });
    }
  };

  const onPause = async () => {
    providerRef.current?.pause();
    setUiState("paused");
    if (session) await interviewApi.pause(session.id);
  };

  const onResume = async () => {
    providerRef.current?.resume();
    setUiState("listening");
    if (session) await interviewApi.resume(session.id);
  };

  const sendText = async (override?: string) => {
    if (!session) return;
    const text = (override ?? textDraft).trim();
    if (!text) return;
    if (!override) setTextDraft("");
    setUiState("thinking");
    try {
      if (providerRef.current && mode === "voice") {
        providerRef.current.sendText(text);
        handleUserText(text, true);
      } else {
        const result = await interviewApi.chat(session.id, text);
        addSegment(result.user);
        addSegment(result.assistant);
        if (awaitingLinkDecision.current && USER_YES_RE.test(text.trim())) {
          setShowLinksPanel(true);
          setLinksExpanded(true);
          awaitingLinkDecision.current = false;
        }
        handleAssistantText(result.assistant.text, true);
        setUiState("speaking");
        setTimeout(() => setUiState(mode === "voice" ? "listening" : "idle"), 400);
      }
    } catch (err) {
      setUiState("error");
      toast({
        title: "No pudimos enviar tu respuesta",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    }
  };

  const finalize = useCallback(async () => {
    if (!session || finalizing) return;
    setFinalizing(true);
    disconnectLive();
    try {
      const filledLinks = draftLinks.filter((l) => l.url.trim());
      if (filledLinks.length) {
        const summary = filledLinks.map((l) => `${l.label}: ${l.url.trim()}`).join("\n");
        await interviewApi.addSegments(session.id, [
          { role: "user", text: `Links para incluir en el CV:\n${summary}` },
        ]);
      }
      const transcript = useInterviewStore.getState().segments.map((segment) => ({
        role: segment.role,
        text: segment.text,
      }));
      const result = await interviewApi.finalize(session.id, transcript);
      setProfile(result.profile);
      navigate("/review");
    } catch (err) {
      autoFinalizeStarted.current = false;
      toast({
        title: "No pudimos organizar tu experiencia",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setFinalizing(false);
    }
  }, [disconnectLive, draftLinks, finalizing, navigate, session, setProfile]);

  useEffect(() => {
    finalizeRef.current = finalize;
  }, [finalize]);

  const submitLinks = async () => {
    const filled = draftLinks.filter((l) => l.url.trim());
    if (!filled.length) {
      toast({ title: "Pegá al menos un link", variant: "error" });
      return;
    }
    const summary = filled.map((l) => `${l.label || "Link"}: ${l.url.trim()}`).join("\n");
    setLinksExpanded(true);
    await sendText(`Sí, quiero incluir estos links:\n${summary}`);
    toast({ title: "Links agregados a la conversación", variant: "success" });
  };

  const statusLabel = STATE_LABEL[uiState] ?? "Listo";
  const statusTone =
    uiState === "speaking"
      ? "bg-primary-soft text-primary-strong"
      : uiState === "listening"
        ? "bg-mint text-mint-strong"
        : uiState === "thinking" || uiState === "connecting"
          ? "bg-butter text-butter-strong"
          : uiState === "error"
            ? "bg-peach text-peach-strong"
            : "bg-background text-muted";
  const transcript = useMemo(() => segments, [segments]);
  const visibleCaption = stripDoneMarker(caption || liveText || "Cuando empieces, vas a ver acá la conversación.");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <InterviewBriefingModal open={briefingOpen} onContinue={acceptBriefing} />
      <ProcessStepper current={1} />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="animate-fade-up overflow-hidden">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-primary">Asistente</p>
                <h1 className="text-2xl font-extrabold tracking-tight">Tu entrevista</h1>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors duration-300",
                  statusTone,
                )}
              >
                <span className="relative flex h-2 w-2">
                  {uiState === "speaking" || uiState === "listening" ? (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
                  ) : null}
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                </span>
                {statusLabel}
              </span>
            </div>

            <VoiceVisualizer
              active={uiState === "listening" || uiState === "speaking" || uiState === "thinking"}
              mode={uiState === "speaking" ? "assistant" : uiState === "listening" ? "user" : "idle"}
              level={level}
            />
            {mode === "voice" && micAllowed ? (
              <p className="text-center text-xs text-muted">
                Hablá cerca del micrófono. Ignoramos ruidos de fondo (autos, motos). Cuando pares ~2 segundos, el
                asistente continúa.
              </p>
            ) : null}

            <div className="rounded-3xl border border-primary-soft bg-white p-5 shadow-sm" aria-live="polite">
              <p className="flex items-center gap-2 text-sm font-bold text-primary-strong">
                <MessageCircle className="h-4 w-4" />
                Lo que está diciendo el asistente
              </p>
              <p key={visibleCaption.slice(0, 24)} className="mt-2 animate-fade-up whitespace-pre-wrap text-base leading-relaxed text-text">
                {visibleCaption}
              </p>
            </div>

            {showLinksPanel ? (
              <div className="animate-pop-in rounded-3xl border border-sky bg-sky/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-bold text-sky-strong">
                      <Link2 className="h-4 w-4" />
                      Links profesionales
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {linksExpanded
                        ? "¡Bueno! Incluilos acá. Podés pegar LinkedIn, portfolio, GitHub u otros."
                        : "Si querés sumar links, tocá “Sí, quiero agregar” o pegá las URLs acá."}
                    </p>
                  </div>
                  {!linksExpanded ? (
                    <Button size="sm" onClick={() => setLinksExpanded(true)}>
                      Sí, quiero agregar
                    </Button>
                  ) : null}
                </div>

                {linksExpanded ? (
                  <div className="mt-4 space-y-3">
                    {draftLinks.map((link, idx) => (
                      <div key={link.id} className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
                        <Input
                          value={link.label}
                          aria-label={`Etiqueta del link ${idx + 1}`}
                          onChange={(e) =>
                            setDraftLinks((prev) =>
                              prev.map((item) => (item.id === link.id ? { ...item, label: e.target.value } : item)),
                            )
                          }
                          placeholder="LinkedIn"
                        />
                        <Input
                          value={link.url}
                          aria-label={`URL del link ${idx + 1}`}
                          onChange={(e) =>
                            setDraftLinks((prev) =>
                              prev.map((item) => (item.id === link.id ? { ...item, url: e.target.value } : item)),
                            )
                          }
                          placeholder="https://…"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Quitar link"
                          onClick={() => setDraftLinks((prev) => prev.filter((item) => item.id !== link.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setDraftLinks((prev) => [...prev, { id: crypto.randomUUID(), label: "Link", url: "" }])
                        }
                      >
                        <Plus className="h-4 w-4" />
                        Otro link
                      </Button>
                      <Button type="button" size="sm" onClick={() => void submitLinks()}>
                        <Send className="h-4 w-4" />
                        Enviar links
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {micAllowed === null && mode === "voice" ? (
              <div className="animate-fade-up rounded-3xl border border-dashed border-primary/30 bg-primary-soft/40 p-4">
                <p className="text-sm text-muted">
                  Para conversar con el asistente necesitamos acceso a tu micrófono.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={() => void requestMic()}>
                    <Mic className="h-4 w-4" />
                    Permitir micrófono
                  </Button>
                  <Button variant="secondary" onClick={() => setMode("text")}>
                    <Keyboard className="h-4 w-4" />
                    Escribir respuesta
                  </Button>
                </div>
              </div>
            ) : null}

            {micAllowed === false ? (
              <p className="text-sm text-muted">No hay problema. Podés continuar escribiendo.</p>
            ) : null}

            {error ? (
              <div className="animate-pop-in rounded-3xl border border-peach bg-peach/40 p-4 text-sm font-semibold text-peach-strong">
                {error}
                <div className="mt-3">
                  <Button size="sm" variant="secondary" onClick={() => void connectLive()}>
                    Reconectar
                  </Button>
                </div>
              </div>
            ) : null}

            {(mode === "text" || micAllowed === false) && (
              <div className="space-y-3">
                <Textarea
                  value={textDraft}
                  onChange={(e) => setTextDraft(e.target.value)}
                  placeholder="Escribí tu respuesta…"
                  aria-label="Escribir respuesta"
                />
                <Button onClick={() => void sendText()} disabled={!textDraft.trim()}>
                  <Send className="h-4 w-4" />
                  Enviar
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {mode === "voice" && micAllowed ? (
                uiState === "paused" ? (
                  <Button variant="secondary" onClick={() => void onResume()}>
                    <Play className="h-4 w-4" />
                    Continuar
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => void onPause()}>
                    <Pause className="h-4 w-4" />
                    Pausar
                  </Button>
                )
              ) : null}
              <Button variant="secondary" onClick={() => setMode(mode === "voice" ? "text" : "voice")}>
                {mode === "voice" ? <Keyboard className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {mode === "voice" ? "Escribir respuesta" : "Volver a voz"}
              </Button>
              <Button onClick={() => void finalize()} disabled={finalizing || !session}>
                {finalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                {finalizing ? "Organizando tu experiencia…" : "Finalizar entrevista"}
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-muted">
              {micAllowed ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
              Micrófono: {micAllowed ? "activo" : micAllowed === false ? "no disponible" : "pendiente"}
            </div>
          </CardContent>
        </Card>

        <Card className="hidden animate-fade-up [animation-delay:120ms] lg:block">
          <CardContent className="p-6">
            <h2 className="flex items-center gap-2 text-sm font-extrabold">
              <MessageCircle className="h-4 w-4 text-primary" />
              Conversación
            </h2>
            <div className="mt-4 flex max-h-[32rem] flex-col gap-3 overflow-y-auto pr-1">
              {transcript.length === 0 ? (
                <p className="rounded-2xl bg-background px-4 py-6 text-center text-sm text-muted">
                  Acá va a aparecer la charla.
                </p>
              ) : null}
              {transcript.map((segment) => (
                <div
                  key={segment.id}
                  className={cn(
                    "max-w-[88%] animate-fade-up px-4 py-2.5 text-sm shadow-sm",
                    segment.role === "assistant"
                      ? "self-start rounded-3xl rounded-bl-md bg-primary-soft text-text"
                      : "self-end rounded-3xl rounded-br-md bg-mint text-text",
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 text-[11px] font-extrabold uppercase tracking-wide",
                      segment.role === "assistant" ? "text-primary-strong" : "text-mint-strong",
                    )}
                  >
                    {segment.role === "assistant" ? "Asistente" : "Vos"}
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{stripDoneMarker(segment.text)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
