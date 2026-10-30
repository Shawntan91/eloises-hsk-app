"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  Award,
  Sparkles,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import {
  alignCharacters,
  calculateSpeechSimilarity,
  getScoreRating,
  saveShadowingRecord,
  getCharPinyin,
  CharDiff,
} from "@/utils/speechScoring";

interface ListeningShadowingProps {
  transcript: string;
  locale?: "ko" | "zh" | "bilingual";
  onSeekAudio?: (timeSec: number) => void;
}

interface SentenceItem {
  id: number;
  text: string;
}

export default function ListeningShadowing({
  transcript,
  locale = "ko",
  onSeekAudio,
}: ListeningShadowingProps) {
  const isZh = locale === "zh";

  // Check Web Speech API support
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [activeSentenceId, setActiveSentenceId] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Per-sentence evaluation results map: sentenceId -> { spoken, score, diffs }
  const [results, setResults] = useState<
    Record<
      number,
      {
        spoken: string;
        score: number;
        diffs: CharDiff[];
      }
    >
  >({});

  const recognitionRef = useRef<any>(null);

  // Split transcript into discrete sentences using punctuation 。！？?!;； and newlines
  const sentences: SentenceItem[] = React.useMemo(() => {
    if (!transcript) return [];
    // Split on Chinese and English sentence delimiters
    const rawParts = transcript
      .split(/(?<=[。！？\n?!;；])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !/^[\s。！？?!;；]+$/.test(s));

    return rawParts.map((text, idx) => ({ id: idx, text }));
  }, [transcript]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasSpeech =
        "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
      setIsSupported(Boolean(hasSpeech));
    }
  }, []);

  const handleStartShadowing = (sentenceId: number, sentenceText: string) => {
    setErrorMsg(null);
    setActiveSentenceId(sentenceId);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg(
        isZh
          ? "当前浏览器不支持语音跟读识别，建议使用 Chrome 或 Safari 浏览器。"
          : "현재 브라우저는 음성 인식을 지원하지 않습니다. Chrome/Safari 최신 버전을 권장합니다."
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "zh-CN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const spoken = event.results[0][0]?.transcript || "";
        const score = calculateSpeechSimilarity(sentenceText, spoken);
        const diffs = alignCharacters(sentenceText, spoken);

        setResults((prev) => ({
          ...prev,
          [sentenceId]: { spoken, score, diffs },
        }));

        // Persist to localStorage eloise_shadowing
        saveShadowingRecord(sentenceText, score);
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setErrorMsg(
            isZh
              ? "⚠️ 麦克风权限被拒绝，请在浏览器地址栏点击锁形图标开启麦克风权限。"
              : "⚠️ 마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크를 허용해 주세요."
          );
        } else if (event.error === "no-speech") {
          setErrorMsg(
            isZh
              ? "未检测到声音，请靠近麦克风重新跟读。"
              : "음성이 감지되지 않았습니다. 마이크에 대고 다시 말씀해 주세요."
          );
        } else {
          setErrorMsg(
            isZh
              ? `语音识别错误 (${event.error})，请重试。`
              : `음성 인식 오류 (${event.error}). 다시 시도해 주세요.`
          );
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      setIsRecording(false);
      setErrorMsg(
        isZh
          ? `启动语音识别失败: ${e.message || "请稍后重试"}`
          : `음성 인식을 시작할 수 없습니다: ${e.message || "다시 시도해 주세요"}`
      );
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
  };

  const playTTS = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "zh-CN";
      utter.rate = 0.85; // slightly slower for language learners
      window.speechSynthesis.speak(utter);
    }
  };

  if (sentences.length === 0) return null;

  return (
    <div className="mt-4 pt-3.5 border-t border-slate-200">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-1.5 font-bold text-xs text-purple-900">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>{isZh ? "逐句跟读发音评测 (Shadowing)" : "문장별 음성跟读 (Shadowing) 발음 훈련"}</span>
          <span className="text-[10px] text-purple-600 bg-purple-100/70 px-2 py-0.5 rounded-full font-mono">
            共 {sentences.length} 句
          </span>
        </div>

        {!isSupported && (
          <span className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            {isZh
              ? "当前浏览器不支持跟读，建议使用 Chrome/Safari 最新版"
              : "현재 브라우저는 음성 인식을 지원하지 않습니다. Chrome/Safari 최신 버전을 권장합니다"}
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Sentence List */}
      <div className="space-y-3">
        {sentences.map((item, index) => {
          const res = results[item.id];
          const isThisRecording = isRecording && activeSentenceId === item.id;
          const rating = res ? getScoreRating(res.score) : null;

          return (
            <div
              key={item.id}
              className={`p-3 rounded-2xl border transition ${
                isThisRecording
                  ? "bg-purple-50/80 border-purple-300 ring-2 ring-purple-400/30"
                  : res
                  ? "bg-white border-slate-200"
                  : "bg-slate-50/70 border-slate-200 hover:bg-white"
              }`}
            >
              {/* Top sentence row */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 text-[11px] font-bold flex items-center justify-center font-mono shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {isZh ? "原句" : "원문 문장"}
                    </span>
                  </div>

                  {/* Character alignment display if evaluated, else plain text */}
                  {res && res.diffs.length > 0 ? (
                    <div className="flex flex-wrap gap-x-1 gap-y-1.5 my-1">
                      {res.diffs.map((d, dIdx) => {
                        let colorClass = "text-slate-800 bg-slate-100";
                        let titleText = "未识别";
                        if (d.status === "correct") {
                          colorClass = "text-emerald-700 bg-emerald-50 border-emerald-200 font-bold";
                          titleText = "发音正确";
                        } else if (d.status === "error") {
                          colorClass = "text-rose-700 bg-rose-50 border-rose-200 font-bold line-through";
                          titleText = "发音偏差";
                        } else if (d.status === "missed") {
                          colorClass = "text-slate-400 bg-slate-100 border-dashed border-slate-300";
                          titleText = "漏读";
                        }

                        return (
                          <div
                            key={dIdx}
                            className={`flex flex-col items-center px-1.5 py-0.5 rounded-md border text-xs sm:text-sm ${colorClass}`}
                            title={`${d.char} (${d.pinyin || ""}) - ${titleText}`}
                          >
                            <span className="text-[10px] text-slate-400 font-mono leading-none">
                              {d.pinyin}
                            </span>
                            <span className="leading-tight">{d.char}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed font-sans">
                      {item.text}
                    </p>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1.5 shrink-0 self-start pt-1">
                  {/* Listen Original Audio / TTS */}
                  <button
                    type="button"
                    onClick={() => playTTS(item.text)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-purple-100 text-purple-700 text-xs font-bold transition cursor-pointer"
                    title={isZh ? "朗读原句 (TTS)" : "원어민 발음 듣기"}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{isZh ? "听原音" : "원음 듣기"}</span>
                  </button>

                  {/* Speech Recognition Button */}
                  {isSupported && (
                    <>
                      {isThisRecording ? (
                        <button
                          type="button"
                          onClick={handleStopRecording}
                          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-600 text-white text-xs font-bold animate-pulse cursor-pointer shadow-xs"
                        >
                          <MicOff className="w-3.5 h-3.5" />
                          <span>{isZh ? "完成" : "녹음 완료"}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartShadowing(item.id, item.text)}
                          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
                          title={isZh ? "开始跟读此句" : "마이크로 따라 읽기"}
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>{isZh ? "跟读" : "따라읽기"}</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Evaluation score badge & legend */}
              {res && rating && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full border font-bold ${rating.badgeClass}`}>
                      {rating.tier === "excellent" ? "🎉 " : rating.tier === "good" ? "👍 " : "💪 "}
                      {res.score} {isZh ? "分" : "점"} · {isZh ? rating.labelZh : rating.labelKo}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isZh ? "识别文本: " : "인식된 발음: "}
                      <strong className="text-slate-800 font-sans">{res.spoken}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{isZh ? "发音准确" : "정확"}</span>
                    </span>
                    <span className="flex items-center gap-0.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>{isZh ? "偏差" : "오류"}</span>
                    </span>
                    <span className="flex items-center gap-0.5">
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                      <span>{isZh ? "漏读" : "누락"}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
