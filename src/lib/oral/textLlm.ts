import { GoogleGenAI } from "@google/genai";

export interface StructuredLlmMessage {
  role: "user" | "assistant";
  text: string;
}

export interface StructuredLlmOptions {
  systemInstruction: string;
  messages: StructuredLlmMessage[];
  responseSchema: Record<string, unknown>;
  temperature?: number;
}

export interface StructuredLlmResult<T> {
  data: T;
  provider: string;
  model: string;
}

export class LlmServiceError extends Error {
  status: number;
  constructor(message: string, status: number = 500) {
    super(message);
    this.status = status;
  }
}

const notFoundGeminiModels = new Set<string>();
let cachedGeminiModels: { models: string[]; fetchedAt: number } | null = null;
const MODEL_LIST_CACHE_TTL_MS = 10 * 60 * 1000;

function extractErrorInfo(err: unknown): { status: number; message: string } {
  if (!err) return { status: 500, message: "Unknown error" };
  const obj = err as { status?: number; code?: number; message?: string };
  const msg = obj.message || String(err);
  let status = typeof obj.status === "number" ? obj.status : typeof obj.code === "number" ? obj.code : 500;

  if (status === 500) {
    if (/\b503\b|UNAVAILABLE|high demand/i.test(msg)) status = 503;
    else if (/\b429\b|RESOURCE_EXHAUSTED|rate limit/i.test(msg)) status = 429;
    else if (/\b404\b|NOT_FOUND|not found/i.test(msg)) status = 404;
    else if (/\b401\b|\b403\b|PERMISSION_DENIED|API_KEY_INVALID/i.test(msg)) status = 401;
  }
  return { status, message: msg };
}

function stripJsonFormatting(raw: string): string {
  let cleaned = raw.trim();
  // Remove <think>...</think> blocks emitted by reasoning models if any
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Remove markdown ```json ... ``` fences
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    cleaned = fenceMatch[1].trim();
  }
  return cleaned;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isUsableTextModelName(name: string): boolean {
  const lower = name.toLowerCase();
  if (!lower.includes("gemini")) return false;
  const blocked = [
    "embedding",
    "aqa",
    "imagen",
    "veo",
    "tts",
    "image",
    "live",
    "audio",
    "robotics",
    "computer-use",
    "gemma",
  ];
  return !blocked.some((kw) => lower.includes(kw));
}

function scoreModelPriority(name: string): number {
  const lower = name.toLowerCase();
  if (lower.includes("flash-lite")) return 1;
  if (lower.includes("flash")) return 2;
  if (lower.includes("pro")) return 3;
  return 4;
}

async function discoverGeminiFallbackModels(ai: GoogleGenAI): Promise<string[]> {
  if (
    cachedGeminiModels &&
    Date.now() - cachedGeminiModels.fetchedAt < MODEL_LIST_CACHE_TTL_MS
  ) {
    return cachedGeminiModels.models;
  }

  try {
    const pager = await ai.models.list({ config: { pageSize: 50 } });
    const discovered: string[] = [];
    for await (const m of pager) {
      const shortName = (m.name || "").replace(/^models\//, "");
      const supportsGen =
        !m.supportedActions ||
        m.supportedActions.includes("generateContent");
      if (shortName && supportsGen && isUsableTextModelName(shortName)) {
        discovered.push(shortName);
      }
      if (discovered.length >= 40) break;
    }

    discovered.sort((a, b) => scoreModelPriority(a) - scoreModelPriority(b));
    cachedGeminiModels = { models: discovered, fetchedAt: Date.now() };
    return discovered;
  } catch {
    return [];
  }
}

async function callGeminiOnce<T>(
  ai: GoogleGenAI,
  model: string,
  options: StructuredLlmOptions
): Promise<T> {
  const contents = options.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: options.systemInstruction,
      responseMimeType: "application/json",
      responseSchema: options.responseSchema,
      temperature: options.temperature ?? 0.6,
    },
  });

  const rawText = stripJsonFormatting(response.text || "");
  if (!rawText) {
    throw new LlmServiceError("Gemini returned empty response", 502);
  }
  return JSON.parse(rawText) as T;
}

async function tryGeminiWithFallbacks<T>(
  apiKey: string,
  options: StructuredLlmOptions
): Promise<{ result?: StructuredLlmResult<T>; lastStatus: number; lastError: string }> {
  const ai = new GoogleGenAI({ apiKey });
  const primary = process.env.GEMINI_TEXT_MODEL?.trim() || "gemini-3.8-flash";
  const explicitFallbacks = (process.env.GEMINI_FALLBACK_MODELS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const candidates = Array.from(
    new Set([primary, ...explicitFallbacks])
  ).filter((m) => !notFoundGeminiModels.has(m));

  let lastStatus = 500;
  let lastError = "";
  let triedCount = 0;

  // Try primary + explicit fallbacks first
  for (const model of candidates) {
    const maxAttempts = model === primary ? 2 : 1;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        triedCount++;
        const data = await callGeminiOnce<T>(ai, model, options);
        return {
          result: { data, provider: "gemini", model },
          lastStatus: 200,
          lastError: "",
        };
      } catch (err) {
        const info = extractErrorInfo(err);
        lastStatus = info.status;
        lastError = `[gemini:${model}] ${info.message}`;
        console.warn(`[textLlm] ${lastError} (status=${info.status})`);

        if (info.status === 404) {
          notFoundGeminiModels.add(model);
          break;
        }
        if ((info.status === 503 || info.status === 429) && attempt + 1 < maxAttempts) {
          await sleep(650);
          continue;
        }
        break;
      }
    }
  }

  // If primary/explicit models hit 503/429/404 and no explicit fallback worked, auto-discover available models
  if (lastStatus === 503 || lastStatus === 429 || lastStatus === 404 || triedCount === 0) {
    const discovered = await discoverGeminiFallbackModels(ai);
    const extraCandidates = discovered
      .filter((m) => !candidates.includes(m) && !notFoundGeminiModels.has(m))
      .slice(0, 3);

    for (const model of extraCandidates) {
      try {
        const data = await callGeminiOnce<T>(ai, model, options);
        return {
          result: { data, provider: "gemini", model },
          lastStatus: 200,
          lastError: "",
        };
      } catch (err) {
        const info = extractErrorInfo(err);
        lastStatus = info.status;
        lastError = `[gemini:${model}] ${info.message}`;
        console.warn(`[textLlm] fallback ${lastError} (status=${info.status})`);
        if (info.status === 404) {
          notFoundGeminiModels.add(model);
        }
      }
    }
  }

  return { lastStatus, lastError };
}

async function callOpenAiCompatibleJson<T>(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  options: StructuredLlmOptions;
}): Promise<T> {
  const { baseUrl, apiKey, model, options } = params;
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const messages = [
    {
      role: "system",
      content: `${options.systemInstruction}\n\nIMPORTANT: Output ONLY a valid JSON object matching the schema above. Do not wrap in markdown or add extra commentary.`,
    },
    ...options.messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.text,
    })),
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.6,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new LlmServiceError(
        `HTTP ${res.status}: ${errBody.slice(0, 200)}`,
        res.status
      );
    }

    const json = await res.json();
    const content = stripJsonFormatting(
      json?.choices?.[0]?.message?.content || ""
    );
    if (!content) {
      throw new LlmServiceError("Upstream returned empty JSON content", 502);
    }
    return JSON.parse(content) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateOralStructuredJson<T>(
  options: StructuredLlmOptions
): Promise<StructuredLlmResult<T>> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const groqKey = process.env.GROQ_API_KEY?.trim();

  let lastStatus = 500;
  let lastError = "";

  // 1. Primary: Google Gemini (with retry + auto fallback models)
  if (geminiKey) {
    const geminiAttempt = await tryGeminiWithFallbacks<T>(geminiKey, options);
    if (geminiAttempt.result) {
      return geminiAttempt.result;
    }
    lastStatus = geminiAttempt.lastStatus;
    lastError = geminiAttempt.lastError;
  }

  // 2. Fallback: Groq LLM (uses existing working GROQ_API_KEY)
  if (groqKey) {
    const groqCandidates = Array.from(
      new Set(
        [
          process.env.GROQ_TEXT_MODEL?.trim(),
          "llama-3.3-70b-versatile",
          "qwen/qwen3-32b",
          "llama-3.1-8b-instant",
        ].filter((m): m is string => Boolean(m))
      )
    );

    for (const model of groqCandidates) {
      try {
        const data = await callOpenAiCompatibleJson<T>({
          baseUrl: "https://api.groq.com/openai/v1",
          apiKey: groqKey,
          model,
          options,
        });
        console.info(`[textLlm] Served via Groq fallback model=${model}`);
        return { data, provider: "groq", model };
      } catch (err) {
        const info = extractErrorInfo(err);
        lastStatus = info.status;
        lastError = `[groq:${model}] ${info.message}`;
        console.warn(`[textLlm] ${lastError}`);
      }
    }
  }

  // 3. Optional Fallback: Generic OpenAI-compatible AI_API_KEY if configured
  const customKey = process.env.AI_API_KEY?.trim();
  const customBase = process.env.AI_BASE_URL?.trim();
  const customModel = process.env.AI_MODEL?.trim();
  if (customKey && customBase && customModel && !customKey.startsWith("AIzaSy")) {
    try {
      const data = await callOpenAiCompatibleJson<T>({
        baseUrl: customBase,
        apiKey: customKey,
        model: customModel,
        options,
      });
      return { data, provider: "custom", model: customModel };
    } catch (err) {
      const info = extractErrorInfo(err);
      lastStatus = info.status;
      lastError = `[custom:${customModel}] ${info.message}`;
    }
  }

  if (!geminiKey && !groqKey) {
    throw new LlmServiceError("服务端未配置 GEMINI_API_KEY 或 GROQ_API_KEY。", 500);
  }

  if (lastStatus === 503 || lastStatus === 429) {
    throw new LlmServiceError(
      "AI 模型当前访问高峰（503/429），请稍等几秒重试，或切换「实时语音通话」模式。",
      503
    );
  }

  throw new LlmServiceError(lastError || "AI 对话服务暂时不可用", lastStatus);
}
