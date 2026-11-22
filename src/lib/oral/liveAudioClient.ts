"use client";

import { GoogleGenAI, LiveServerMessage, Session } from "@google/genai";

export type LiveConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "error"
  | "closed";

export interface LiveTranscriptItem {
  id: string;
  role: "user" | "assistant";
  text: string;
  isFinal: boolean;
}

export interface LiveAudioCallbacks {
  onStateChange: (state: LiveConnectionState, errorMessage?: string) => void;
  onUserTranscript: (text: string, isFinal: boolean) => void;
  onModelTranscript: (text: string, isFinal: boolean) => void;
  onModelSpeakingChange: (speaking: boolean) => void;
}

const WORKLET_CODE = `
class Pcm16kCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._ratio = sampleRate / 16000;
    this._phase = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];

    // Linear interpolation downsample to 16kHz
    while (this._phase < channel.length) {
      const idx = Math.floor(this._phase);
      const frac = this._phase - idx;
      const s0 = channel[idx];
      const s1 = idx + 1 < channel.length ? channel[idx + 1] : s0;
      const sample = s0 + (s1 - s0) * frac;
      const clamped = Math.max(-1, Math.min(1, sample));
      this._buffer.push(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff);
      this._phase += this._ratio;
    }
    this._phase -= channel.length;

    // Flush ~100ms (1600 samples at 16kHz)
    if (this._buffer.length >= 1600) {
      const int16 = new Int16Array(this._buffer.splice(0, 1600));
      this.port.postMessage(int16.buffer, [int16.buffer]);
    }
    return true;
  }
}
registerProcessor("pcm-16k-capture", Pcm16kCaptureProcessor);
`;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...Array.from(slice));
  }
  return btoa(binary);
}

function base64ToInt16Array(base64: string): Int16Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

const CONNECTION_TIMEOUT_MS = 8000;

export class LiveAudioClient {
  private callbacks: LiveAudioCallbacks;
  private session: Session | null = null;
  private captureCtx: AudioContext | null = null;
  private playbackCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private workletUrl: string | null = null;

  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private nextPlayTime = 0;
  private muted = false;
  private closed = false;

  constructor(callbacks: LiveAudioCallbacks) {
    this.callbacks = callbacks;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  async connect(ephemeralToken: string, model: string): Promise<void> {
    this.closed = false;
    this.callbacks.onStateChange("connecting");

    try {
      // 1. Request microphone with echo cancellation & noise suppression
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      // 2. Prepare AudioContexts (playback at 24kHz for Gemini Live output)
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;

      this.captureCtx = new AudioCtx();
      this.playbackCtx = new AudioCtx({ sampleRate: 24000 });
      if (this.captureCtx.state === "suspended") await this.captureCtx.resume();
      if (this.playbackCtx.state === "suspended") await this.playbackCtx.resume();

      // 3. Connect Gemini Live WebSocket with 8s timeout
      const ai = new GoogleGenAI({
        apiKey: ephemeralToken,
        httpOptions: { apiVersion: "v1beta" },
      });

      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("CONNECTION_TIMEOUT"));
        }, CONNECTION_TIMEOUT_MS);
      });

      const connectPromise = ai.live.connect({
        model,
        callbacks: {
          onopen: () => {
            if (this.closed) return;
            this.callbacks.onStateChange("connected");
          },
          onmessage: (msg: LiveServerMessage) => {
            this.handleServerMessage(msg);
          },
          onerror: (err: ErrorEvent) => {
            if (this.closed) return;
            this.callbacks.onStateChange(
              "error",
              err.message || "WebSocket connection error"
            );
          },
          onclose: () => {
            if (!this.closed) {
              this.callbacks.onStateChange("closed");
              this.cleanupAudio();
            }
          },
        },
      });

      this.session = await Promise.race([connectPromise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);

      if (this.closed) {
        this.disconnect();
        return;
      }

      // 4. Start AudioWorklet capture -> 16kHz PCM streaming
      await this.startMicWorklet();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect";
      this.callbacks.onStateChange("error", msg);
      this.disconnect();
      throw err;
    }
  }

  private async startMicWorklet(): Promise<void> {
    if (!this.captureCtx || !this.mediaStream || !this.session) return;

    const blob = new Blob([WORKLET_CODE], { type: "application/javascript" });
    this.workletUrl = URL.createObjectURL(blob);
    await this.captureCtx.audioWorklet.addModule(this.workletUrl);

    const source = this.captureCtx.createMediaStreamSource(this.mediaStream);
    this.workletNode = new AudioWorkletNode(
      this.captureCtx,
      "pcm-16k-capture"
    );

    this.workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      if (this.closed || this.muted || !this.session) return;
      const base64Pcm = arrayBufferToBase64(event.data);
      try {
        this.session.sendRealtimeInput({
          media: {
            data: base64Pcm,
            mimeType: "audio/pcm;rate=16000",
          },
        });
      } catch {
        // ignore send errors on closing socket
      }
    };

    source.connect(this.workletNode);
    // Connect to destination with 0 gain so Safari keeps worklet alive without local echo
    const zeroGain = this.captureCtx.createGain();
    zeroGain.gain.value = 0;
    this.workletNode.connect(zeroGain);
    zeroGain.connect(this.captureCtx.destination);
  }

  private handleServerMessage(msg: LiveServerMessage): void {
    const content = msg.serverContent;
    if (!content) return;

    if (content.interrupted) {
      this.clearPlaybackQueue();
      this.callbacks.onModelSpeakingChange(false);
    }

    if (content.inputTranscription?.text) {
      this.callbacks.onUserTranscript(
        content.inputTranscription.text,
        Boolean(content.inputTranscription.finished)
      );
    }

    if (content.outputTranscription?.text) {
      this.callbacks.onModelTranscript(
        content.outputTranscription.text,
        Boolean(content.outputTranscription.finished)
      );
    }

    const parts = content.modelTurn?.parts;
    if (parts && parts.length > 0) {
      for (const part of parts) {
        if (
          part.inlineData?.data &&
          part.inlineData.mimeType?.startsWith("audio/pcm")
        ) {
          this.enqueuePcm24k(part.inlineData.data);
        }
      }
    }

    if (content.turnComplete) {
      this.callbacks.onModelSpeakingChange(false);
    }
  }

  private enqueuePcm24k(base64Data: string): void {
    if (!this.playbackCtx || this.closed) return;
    if (this.playbackCtx.state === "suspended") {
      this.playbackCtx.resume().catch(() => {});
    }

    const int16 = base64ToInt16Array(base64Data);
    if (int16.length === 0) return;

    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 0x8000;
    }

    const buffer = this.playbackCtx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = this.playbackCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.playbackCtx.destination);

    const now = this.playbackCtx.currentTime;
    if (this.nextPlayTime < now) {
      this.nextPlayTime = now + 0.02;
    }

    this.activeSources.add(source);
    this.callbacks.onModelSpeakingChange(true);

    source.onended = () => {
      this.activeSources.delete(source);
      if (this.activeSources.size === 0) {
        this.callbacks.onModelSpeakingChange(false);
      }
    };

    source.start(this.nextPlayTime);
    this.nextPlayTime += buffer.duration;
  }

  private clearPlaybackQueue(): void {
    for (const src of Array.from(this.activeSources)) {
      try {
        src.stop();
      } catch {
        // ignore
      }
    }
    this.activeSources.clear();
    if (this.playbackCtx) {
      this.nextPlayTime = this.playbackCtx.currentTime;
    } else {
      this.nextPlayTime = 0;
    }
  }

  disconnect(): void {
    this.closed = true;
    this.clearPlaybackQueue();

    if (this.session) {
      try {
        this.session.close();
      } catch {
        // ignore
      }
      this.session = null;
    }

    this.cleanupAudio();
  }

  private cleanupAudio(): void {
    if (this.workletNode) {
      try {
        this.workletNode.disconnect();
      } catch {
        // ignore
      }
      this.workletNode = null;
    }

    if (this.workletUrl) {
      URL.revokeObjectURL(this.workletUrl);
      this.workletUrl = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.captureCtx) {
      this.captureCtx.close().catch(() => {});
      this.captureCtx = null;
    }

    if (this.playbackCtx) {
      this.playbackCtx.close().catch(() => {});
      this.playbackCtx = null;
    }
  }
}
