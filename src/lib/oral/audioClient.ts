"use client";

export interface DetectedAudioFormat {
  mimeType: string;
  ext: string;
}

/**
 * Dynamically probe MediaRecorder.isTypeSupported in iOS Safari-first priority order:
 * audio/mp4 -> audio/webm;codecs=opus -> audio/webm
 */
export function detectSupportedAudioMime(): DetectedAudioFormat {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return { mimeType: "", ext: "webm" };
  }

  const candidates: DetectedAudioFormat[] = [
    { mimeType: "audio/mp4", ext: "mp4" },
    { mimeType: "audio/webm;codecs=opus", ext: "webm" },
    { mimeType: "audio/webm", ext: "webm" },
  ];

  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c.mimeType)) {
        return c;
      }
    } catch {
      // continue probing
    }
  }
  return { mimeType: "", ext: "webm" };
}

let sharedAudioEl: HTMLAudioElement | null = null;
let sharedAudioCtx: AudioContext | null = null;
const ttsBlobUrlCache = new Map<string, string>();

function getSharedAudioElement(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioEl) {
    sharedAudioEl = new Audio();
    sharedAudioEl.setAttribute("playsinline", "true");
  }
  return sharedAudioEl;
}

/**
 * Must be called synchronously inside a user click/tap handler on iOS Safari
 * so subsequent async audio playback is allowed.
 */
export function unlockAudioPlayback(): void {
  if (typeof window === "undefined") return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtx && !sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
  } catch {
    // ignore AudioContext errors
  }

  try {
    const el = getSharedAudioElement();
    if (el) {
      // Play a tiny silent WAV data URI to unlock HTMLAudioElement on iOS
      const prevSrc = el.src;
      if (!prevSrc) {
        el.src =
          "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
        el.volume = 0;
        const p = el.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            el.pause();
            el.volume = 1;
          }).catch(() => {
            el.volume = 1;
          });
        }
      }
    }
  } catch {
    // ignore unlock errors
  }
}

export function stopAllOralAudio(): void {
  if (typeof window === "undefined") return;
  if (sharedAudioEl) {
    try {
      sharedAudioEl.pause();
      sharedAudioEl.currentTime = 0;
    } catch {
      // ignore
    }
  }
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

export type PlayTTSStatus = "played" | "fallback_played" | "blocked" | "error";

export interface PlayTTSResult {
  status: PlayTTSStatus;
}

export function speakNativeFallback(text: string, rate: number = 1.0): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "zh-CN";
      utter.rate = rate;
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      window.speechSynthesis.speak(utter);
    } catch {
      resolve();
    }
  });
}

export async function fetchAndCacheTTSUrl(
  text: string,
  voice?: string,
  rate: number = 1.0
): Promise<string | null> {
  const cleanText = text.trim();
  if (!cleanText) return null;

  const cacheKey = `${voice || "default"}::${rate.toFixed(2)}::${cleanText}`;
  const cached = ttsBlobUrlCache.get(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch("/api/oral/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: cleanText, voice, rate }),
    });

    if (!res.ok) {
      return null;
    }

    const blob = await res.blob();
    if (!blob || blob.size === 0) {
      return null;
    }

    const objectUrl = URL.createObjectURL(blob);
    ttsBlobUrlCache.set(cacheKey, objectUrl);
    return objectUrl;
  } catch {
    return null;
  }
}

export async function playOralTTS(params: {
  text: string;
  voice?: string;
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
}): Promise<PlayTTSResult> {
  const { text, voice, rate = 1.0, onStart, onEnd } = params;
  stopAllOralAudio();

  const audioUrl = await fetchAndCacheTTSUrl(text, voice, rate);
  const el = getSharedAudioElement();

  if (audioUrl && el) {
    try {
      el.src = audioUrl;
      el.volume = 1;
      onStart?.();

      await new Promise<void>((resolve, reject) => {
        const handleEnded = () => {
          cleanup();
          resolve();
        };
        const handleError = () => {
          cleanup();
          reject(new Error("audio_element_error"));
        };
        const cleanup = () => {
          el.removeEventListener("ended", handleEnded);
          el.removeEventListener("error", handleError);
        };

        el.addEventListener("ended", handleEnded);
        el.addEventListener("error", handleError);

        const playPromise = el.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch((err) => {
            cleanup();
            reject(err);
          });
        }
      });

      onEnd?.();
      return { status: "played" };
    } catch (err: unknown) {
      onEnd?.();
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError") {
        // Safari blocked async autoplay — caller should highlight manual play button
        return { status: "blocked" };
      }
      // Other audio error -> fallback to native speechSynthesis
      onStart?.();
      await speakNativeFallback(text, rate);
      onEnd?.();
      return { status: "fallback_played" };
    }
  }

  // Edge TTS failed or unavailable -> fallback to browser native speechSynthesis
  onStart?.();
  await speakNativeFallback(text, rate);
  onEnd?.();
  return { status: "fallback_played" };
}
