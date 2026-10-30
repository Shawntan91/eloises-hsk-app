"use client";

import React, { useState, useEffect, useRef } from "react";
import { Question } from "@/types/question";
import { loadStoredAiConfig, saveStoredAiConfig, AI_PROVIDER_PRESETS, AiProvider } from "@/types/aiConfig";
import {
  Bot,
  Send,
  X,
  Loader2,
  Sparkles,
  Key,
  RotateCcw,
  BookOpen,
  Volume2,
} from "lucide-react";

interface AiTutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  question?: Question | null;
  word?: any | null; // HSK Word item
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export const AiTutorModal: React.FC<AiTutorModalProps> = ({
  isOpen,
  onClose,
  question,
  word,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState<AiProvider>("deepseek");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const isWordMode = Boolean(word);

  useEffect(() => {
    if (!isOpen) return;

    const conf = loadStoredAiConfig();
    setApiKey(conf.apiKey || "");
    setProvider(conf.provider || "deepseek");

    // Init chat
    initChat(conf);
  }, [isOpen, question?.id, word?.no]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const initChat = async (conf: any) => {
    setLoading(true);
    setMessages([]);

    try {
      const res = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: isWordMode ? "word" : "question",
          question,
          word,
          action: "init",
          userConfig: conf,
        }),
      });

      const data = await res.json();
      if (data.reply) {
        setMessages([
          {
            id: `ai-init`,
            role: "assistant",
            content: data.reply,
          },
        ]);
      }
    } catch (e) {
      setMessages([
        {
          id: `ai-err`,
          role: "assistant",
          content: "네트워크 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    setInputMessage("");
    const newMessages: ChatMessage[] = [
      ...messages,
      { id: `u-${Date.now()}`, role: "user", content: text },
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      const conf = loadStoredAiConfig();
      const res = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: isWordMode ? "word" : "question",
          question,
          word,
          action: "ask",
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          userConfig: conf,
        }),
      });

      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          { id: `ai-${Date.now()}`, role: "assistant", content: data.reply },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: `ai-err-${Date.now()}`, role: "assistant", content: "답변을 불러오지 못했습니다." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = () => {
    const preset = AI_PROVIDER_PRESETS[provider];
    saveStoredAiConfig({
      enabled: Boolean(apiKey.trim()),
      provider,
      apiKey: apiKey.trim(),
      baseUrl: preset.defaultBaseUrl,
      model: preset.defaultModel,
    });
    setShowConfig(false);
    const conf = loadStoredAiConfig();
    initChat(conf);
  };

  const playSpeech = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "zh-CN";
      window.speechSynthesis.speak(utter);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[88vh] max-h-[760px] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <Bot className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold">
                  {isWordMode ? `AI 단어 과외 선생님 · [${word?.word}]` : "AI 맞춤 HSK 학습 튜터"}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                  Eloise 전용
                </span>
              </div>
              <p className="text-[11px] text-white/80">
                {isWordMode ? `${word?.pinyin} · ${word?.korean}` : "실시간 한국어 해설 및 질의응답"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition text-xs font-semibold flex items-center gap-1"
              title="API 키 설정"
            >
              <Key className="w-3.5 h-3.5 text-amber-200" />
              <span className="hidden sm:inline">API 설정</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* API Usage & Confidentiality Notice Banner */}
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200/80 text-amber-900 flex items-start gap-2.5 text-xs shrink-0 shadow-inner">
          <span className="text-amber-600 text-sm leading-none mt-0.5 shrink-0">⚠️</span>
          <div className="flex-1 leading-snug">
            <span className="font-bold text-amber-950">[이용 안내] </span>
            본 AI 튜터 서비스는 전용 API를 사용하고 있으므로 사이트 링크를 외부에 무단 공유하지 말아주시기 바랍니다. 외부 공유가 필요하신 경우 반드시 관리자에게 문의해 주세요.
          </div>
        </div>

        {/* Inline Config Panel */}
        {showConfig && (
          <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0 text-xs animate-in slide-in-from-top-2">
            <div className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-red-600" />
              <span>대형 AI 모델 API Key 설정 (DeepSeek / Gemini / OpenAI):</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mb-2">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as AiProvider)}
                className="px-3 py-1.5 border border-slate-300 rounded-xl bg-white text-slate-700 font-semibold"
              >
                <option value="deepseek">DeepSeek (강력 추천)</option>
                <option value="antigravity">Google Gemini</option>
                <option value="openai">OpenAI (GPT-4o-mini)</option>
                <option value="qwen">통의천문 (Qwen)</option>
              </select>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API Key 입력 (sk-...)"
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
              />
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-xs"
              >
                저장
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              * API Key가 없어도 스마트 오프라인 AI 모드로 풍부한 한국어 예문과 해설이 기본 제공됩니다.
            </p>
          </div>
        )}

        {/* Word Quick Info Banner if in Word Mode */}
        {isWordMode && (
          <div className="px-5 py-2.5 bg-amber-50/80 border-b border-amber-200/60 flex items-center justify-between shrink-0 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-xl font-black text-slate-900">{word.word}</span>
              <span className="font-mono text-amber-800 font-bold">[{word.pinyin}]</span>
              <span className="text-slate-600 font-medium">{word.korean}</span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                {word.pos_display}
              </span>
            </div>
            <button
              type="button"
              onClick={() => playSpeech(word.word)}
              className="p-1.5 rounded-lg bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 transition flex items-center gap-1 font-bold"
              title="원어민 발음 듣기"
            >
              <Volume2 className="w-3.5 h-3.5 text-red-600" />
              <span>발음</span>
            </button>
          </div>
        )}

        {/* Chat Messages Body */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5 bg-slate-50/50">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${
                m.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold text-white shadow-xs ${
                  m.role === "user" ? "bg-red-600" : "bg-gradient-to-tr from-rose-600 to-amber-600"
                }`}
              >
                {m.role === "user" ? "나" : <Bot className="w-4 h-4 text-amber-200" />}
              </div>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm shadow-xs leading-relaxed whitespace-pre-line font-sans ${
                  m.role === "user"
                    ? "bg-red-600 text-white rounded-tr-none font-medium"
                    : "bg-white text-slate-800 rounded-tl-none border border-slate-200"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs p-2">
              <Loader2 className="w-4 h-4 animate-spin text-red-600" />
              <span>AI 과외 선생님이 답변을 작성 중입니다...</span>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Quick Question Chips for Vocabulary */}
        {isWordMode && (
          <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
            <span className="text-[11px] font-bold text-slate-400 shrink-0">빠른 질문:</span>
            {[
              "HSK 실전 예문 2개 더 알려줘",
              "자주 쓰이는 짝꿍 표현(호응)은?",
              "시험에서 헷갈리는 유의어와 차이점은?",
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSendMessage(chip)}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 border border-slate-200 whitespace-nowrap transition text-[11px] font-medium shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                isWordMode
                  ? "단어에 대해 궁금한 점을 질문해 보세요 (예: 실제 대화에서 어떻게 써?)"
                  : "문제 풀이나 어법에 대해 질문해 보세요"
              }
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-slate-50"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-1.5"
            >
              <span>전송</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AiTutorModal;
