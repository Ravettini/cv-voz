export function createPcmPlayer(sampleRate = 24000) {
  const audioCtx = new AudioContext({ sampleRate });
  let nextTime = 0;

  return {
    async playBase64(base64: string) {
      if (audioCtx.state === "suspended") await audioCtx.resume();
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const view = new DataView(bytes.buffer);
      const samples = bytes.length / 2;
      const float32 = new Float32Array(samples);
      for (let i = 0; i < samples; i += 1) {
        float32[i] = view.getInt16(i * 2, true) / 32768;
      }
      const buffer = audioCtx.createBuffer(1, float32.length, sampleRate);
      buffer.copyToChannel(float32, 0);
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      const startAt = Math.max(audioCtx.currentTime, nextTime);
      source.start(startAt);
      nextTime = startAt + buffer.duration;
    },
    stop() {
      nextTime = 0;
      void audioCtx.close();
    },
  };
}

export function floatTo16BitPcmBase64(float32: Float32Array): string {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i += 1) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export type VoiceFrameAnalysis = {
  rms: number;
  /** Energía de variaciones rápidas (más típica de voz que de rumble de auto/moto). */
  speechLike: number;
  isSpeechLike: boolean;
};

/** Analiza un frame: rechaza rumbles graves (autos/motos) frente a voz. */
export function analyzeVoiceFrame(input: Float32Array): VoiceFrameAnalysis {
  let sum = 0;
  let hpSum = 0;
  let prev = 0;
  let zeroCrossings = 0;
  for (let i = 0; i < input.length; i += 1) {
    const sample = input[i] ?? 0;
    sum += sample * sample;
    const hp = sample - prev;
    prev = sample;
    hpSum += hp * hp;
    if (i > 0) {
      const a = input[i - 1] ?? 0;
      if ((a >= 0 && sample < 0) || (a < 0 && sample >= 0)) zeroCrossings += 1;
    }
  }
  const rms = Math.sqrt(sum / input.length);
  const speechLike = Math.sqrt(hpSum / input.length);
  const zcr = zeroCrossings / input.length;
  // Voz: energía + variaciones medias. Rumbling de motor: RMS alto pero speechLike/zcr bajos.
  const isSpeechLike =
    rms >= 0.02 && speechLike >= 0.012 && zcr >= 0.02 && speechLike / Math.max(rms, 1e-6) >= 0.35;
  return { rms, speechLike, isSpeechLike };
}

/**
 * Solo deja pasar audio cuando hay voz sostenida.
 * Tras la voz, sigue abierto un rato (hangover) para que el servidor detecte el silencio real.
 */
export function createSpeechGate(options?: {
  startFrames?: number;
  hangoverMs?: number;
  frameMs?: number;
}) {
  const startFrames = options?.startFrames ?? 2;
  const hangoverMs = options?.hangoverMs ?? 2200;
  const frameMs = options?.frameMs ?? 256;

  let open = false;
  let speechStreak = 0;
  let hangoverFramesLeft = 0;

  return {
    /** true = este frame debe enviarse a Gemini. */
    push(frame: VoiceFrameAnalysis): boolean {
      if (frame.isSpeechLike) {
        speechStreak += 1;
        hangoverFramesLeft = Math.ceil(hangoverMs / frameMs);
        if (speechStreak >= startFrames) open = true;
      } else {
        speechStreak = 0;
        if (open) {
          hangoverFramesLeft -= 1;
          if (hangoverFramesLeft <= 0) open = false;
        }
      }
      return open;
    },
    isOpen: () => open,
    reset() {
      open = false;
      speechStreak = 0;
      hangoverFramesLeft = 0;
    },
  };
}
