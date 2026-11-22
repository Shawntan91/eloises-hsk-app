import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export interface TTSSynthesizeOptions {
  text: string;
  voice?: string;
  rate?: number; // e.g., 0.8 or 1.0
}

export interface TTSResult {
  audioBuffer: Buffer;
  contentType: string;
}

export interface TTSProvider {
  readonly name: string;
  synthesize(options: TTSSynthesizeOptions): Promise<TTSResult>;
}

const DEFAULT_FEMALE_VOICE = "zh-CN-XiaoxiaoNeural";
export const EDGE_VOICES = {
  female: "zh-CN-XiaoxiaoNeural",
  male: "zh-CN-YunxiNeural",
} as const;

export class EdgeTTSProvider implements TTSProvider {
  readonly name = "edge";

  async synthesize(options: TTSSynthesizeOptions): Promise<TTSResult> {
    const text = options.text.trim();
    if (!text) {
      throw new Error("TTS text cannot be empty");
    }

    const voice = options.voice || DEFAULT_FEMALE_VOICE;
    const rate = typeof options.rate === "number" ? options.rate : 1.0;
    const clampedRate = Math.max(0.5, Math.min(1.5, rate));

    const tts = new MsEdgeTTS({ connectionTimeoutMs: 8000, synthesisTimeoutMs: 12000 });
    try {
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(text, { rate: clampedRate });

      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        audioStream.on("data", (chunk: Buffer | Uint8Array) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        audioStream.on("end", () => resolve());
        audioStream.on("error", (err: Error) => reject(err));
      });

      const audioBuffer = Buffer.concat(chunks);
      if (audioBuffer.length === 0) {
        throw new Error("EdgeTTS returned empty audio buffer");
      }

      return {
        audioBuffer,
        contentType: "audio/mpeg",
      };
    } finally {
      try {
        tts.close();
      } catch {
        // ignore close errors
      }
    }
  }
}

export function getTTSProvider(): TTSProvider {
  const providerName = (process.env.TTS_PROVIDER || "edge").toLowerCase().trim();
  switch (providerName) {
    case "edge":
    default:
      return new EdgeTTSProvider();
  }
}
