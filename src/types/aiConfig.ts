export type AiProvider = "deepseek" | "antigravity" | "openai" | "qwen" | "custom";

export interface AiConfig {
  enabled: boolean;
  provider: AiProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export const AI_PROVIDER_PRESETS: Record<
  AiProvider,
  { name: string; defaultBaseUrl: string; defaultModel: string; placeholder: string }
> = {
  deepseek: {
    name: "DeepSeek",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    placeholder: "sk-...",
  },
  antigravity: {
    name: "Google Gemini",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
    placeholder: "AIzaSy...",
  },
  openai: {
    name: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    placeholder: "sk-...",
  },
  qwen: {
    name: "阿里通义千问 (Qwen)",
    defaultBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-plus",
    placeholder: "sk-...",
  },
  custom: {
    name: "自定义 OpenAI 兼容接口",
    defaultBaseUrl: "",
    defaultModel: "",
    placeholder: "sk-...",
  },
};

const STORAGE_KEY = "eloise_hsk_ai_config";

export function loadStoredAiConfig(): AiConfig {
  if (typeof window === "undefined") {
    return {
      enabled: false,
      provider: "deepseek",
      apiKey: "",
      baseUrl: AI_PROVIDER_PRESETS.deepseek.defaultBaseUrl,
      model: AI_PROVIDER_PRESETS.deepseek.defaultModel,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // fallback
  }
  return {
    enabled: false,
    provider: "deepseek",
    apiKey: "",
    baseUrl: AI_PROVIDER_PRESETS.deepseek.defaultBaseUrl,
    model: AI_PROVIDER_PRESETS.deepseek.defaultModel,
  };
}

export function saveStoredAiConfig(config: AiConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent("ai-config-changed", { detail: config }));
  } catch (e) {
    console.error("Failed to save AI config", e);
  }
}
