"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/common/Header";
import AudioPlayerBar from "@/components/exam/AudioPlayerBar";
import AiTutorModal from "@/components/tutor/AiTutorModal";
import hskExamsData from "@/data/hskExams.json";
import { Question, OptionKey } from "@/types/question";
import { getLocale, Locale } from "@/utils/i18n";
import { formatSeconds } from "@/utils/timer";
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Headphones,
  Bot,
  Volume2,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params?.id as string;

  const [exam, setExam] = useState<any | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [locale, setLocale] = useState<Locale>("ko");
  const [showAiModal, setShowAiModal] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    setLocale(getLocale());
    const found = (hskExamsData as any[]).find((e) => e.id === examId) || hskExamsData[0];
    setExam(found);
  }, [examId]);

  useEffect(() => {
    setShowTranscript(false);
  }, [currentIndex]);

  if (!exam) return null;

  const currentQ = exam.questions[currentIndex];
  const optionKeys: OptionKey[] = ["A", "B", "C", "D", "E", "F"].filter(
    (k) => currentQ?.options && (currentQ.options as any)[k] !== undefined
  ) as OptionKey[];

  const handleJumpAudio = (sec?: number) => {
    if (typeof sec === "number" && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("seek-audio-time", { detail: { time: sec } }));
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen pb-12 sm:pb-0">
      <Header
        title={`${exam.titleKo || exam.title} · 학습 모드`}
        subtitle="정답 및 한국어 심층 해설, 어휘장을 바로 확인하며 학습하는 모드"
        rightElement={
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>홈으로</span>
          </Link>
        }
      />

      {/* Audio Player if present */}
      {exam.audioUrl && (
        <div className="max-w-5xl mx-auto w-full px-3 sm:px-4 pt-3 sm:pt-4">
          <AudioPlayerBar audioUrl={exam.audioUrl} title={exam.title} />
        </div>
      )}

      <main className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left: Question Card */}
        <div className="lg:col-span-8 w-full">
          {currentQ && (
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center">
                    {currentQ.number}
                  </span>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg text-xs truncate max-w-[160px] sm:max-w-none">
                    {locale === "zh" ? currentQ.section : currentQ.sectionKo || currentQ.section}
                  </span>

                  {typeof currentQ.audioTimestamp === "number" && (
                    <button
                      type="button"
                      onClick={() => handleJumpAudio(currentQ.audioTimestamp)}
                      className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 transition cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-red-600" />
                      <span>{formatSeconds(currentQ.audioTimestamp)} 재생</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAiModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5 text-purple-600" />
                    <span>AI 과외</span>
                  </button>

                  <span className="text-xs text-slate-400 font-mono">
                    {currentIndex + 1} / {exam.questions.length}
                  </span>
                </div>
              </div>

              {/* Stem */}
              <div className="text-base sm:text-lg text-slate-900 leading-relaxed font-normal whitespace-pre-line mb-4 font-sans">
                {currentQ.content}
              </div>

              {/* Transcript */}
              {currentQ.transcript && (
                <div className="mb-4 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/80">
                  <button
                    type="button"
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-red-600" />
                      <span>{showTranscript ? "듣기 대본 접기" : "듣기 대본(녹음 원문) 확인하기"}</span>
                    </span>
                    {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showTranscript && (
                    <div className="px-3.5 py-3 bg-white border-t border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {currentQ.transcript}
                    </div>
                  )}
                </div>
              )}

              {/* Image */}
              {currentQ.image && (
                <div className="my-3 sm:my-4 p-2 bg-slate-50 border border-slate-200 rounded-xl inline-block max-w-full">
                  <img
                    src={currentQ.image}
                    alt="插图"
                    className="max-h-48 sm:max-h-56 max-w-full rounded object-contain"
                  />
                </div>
              )}

              {/* 1. 连词成句 Review */}
              {currentQ.type === "order_words" && (
                <div className="mb-5 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                  <div className="text-xs font-bold text-emerald-900">
                    ✅ 공식 표준 정답 문장 (어순 완성):
                  </div>
                  <div className="text-base sm:text-lg font-black text-emerald-800">
                    {currentQ.standardSentence || currentQ.officialAnswer}
                  </div>
                  {currentQ.wordsToOrder && (
                    <div className="text-xs text-slate-500 pt-2 flex items-center gap-2 flex-wrap">
                      <span>단어 조각들:</span>
                      {currentQ.wordsToOrder.map((w: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-white border border-emerald-200 rounded text-slate-700">
                          {w}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 1. 看图造句 / 写作 Review */}
              {currentQ.type === "image_writing" && (
                <div className="mb-5 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                  <div className="text-xs font-bold text-emerald-900 flex items-center gap-2">
                    <span>✅ 모범 예시 답안 (참고 문장):</span>
                    {currentQ.requiredWord && (
                      <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded font-bold">
                        필수 어휘: 【{currentQ.requiredWord}】
                      </span>
                    )}
                  </div>
                  <div className="text-base font-bold text-emerald-800 leading-relaxed">
                    {currentQ.referenceEssay || currentQ.officialAnswer}
                  </div>
                </div>
              )}

              {/* Options */}
              {currentQ.type !== "order_words" && currentQ.type !== "image_writing" && optionKeys.length > 0 && (
                <div className="space-y-2 sm:space-y-2.5 mb-5 sm:mb-6">
                  {optionKeys.map((key) => {
                    const optText = (currentQ.options as any)[key];
                    const optTextKo = (currentQ.optionsKo as any)?.[key];
                    const isCorrect = currentQ.officialAnswer === key;

                    return (
                      <div
                        key={key}
                        className={`p-3 sm:p-3.5 rounded-xl border flex items-start gap-3 transition ${
                          isCorrect
                            ? "border-emerald-300 bg-emerald-50 text-emerald-950 font-bold"
                            : "border-slate-200 bg-slate-50/60 text-slate-700"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isCorrect
                              ? "bg-emerald-600 text-white"
                              : "bg-white border border-slate-300 text-slate-600"
                          }`}
                        >
                          {key}
                        </div>
                        <div className="flex-1 pt-0.5 text-xs sm:text-sm">
                          <div>{optText}</div>
                          {optTextKo && optTextKo !== optText && (
                            <div className="text-xs text-slate-500 mt-0.5 font-sans">{optTextKo}</div>
                          )}
                        </div>
                        {isCorrect && (
                          <span className="text-xs text-emerald-600 font-bold px-2 py-0.5 rounded bg-emerald-100 shrink-0">
                            정답
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Korean Explanation */}
              {currentQ.explanationKo && (
                <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200 mb-4 sm:mb-5 text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                  <div className="font-bold text-red-600 mb-1.5 flex items-center gap-1">
                    <span>💡 한국어 정답 및 심층 해설:</span>
                  </div>
                  {currentQ.explanationKo}
                </div>
              )}

              {/* Vocab List */}
              {currentQ.vocabList && currentQ.vocabList.length > 0 && (
                <div className="bg-amber-50/70 p-3 sm:p-3.5 rounded-xl border border-amber-200/80 mb-5 sm:mb-6">
                  <div className="font-bold text-amber-900 mb-2 flex items-center gap-1 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>핵심 어휘장:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs">
                    {currentQ.vocabList.map((v: any, i: number) => (
                      <div
                        key={i}
                        className="bg-white p-1.5 rounded-lg border border-amber-200/60 flex items-center justify-between"
                      >
                        <span className="font-bold text-slate-800">
                          {v.word} <span className="text-amber-700 font-mono">[{v.pinyin}]</span>
                        </span>
                        <span className="text-slate-600 truncate ml-2">{v.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prev / Next */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>이전 문제</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(exam.questions.length - 1, prev + 1))}
                  disabled={currentIndex === exam.questions.length - 1}
                  className="flex items-center gap-1 px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-30 cursor-pointer"
                >
                  <span>다음 문제</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Question Palette */}
        <div className="lg:col-span-4 w-full">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs sticky top-20">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm mb-3">
              전체 문항 빠른 이동
            </h4>
            <div className="grid grid-cols-5 gap-1.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {exam.questions.map((q: any, idx: number) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-8 rounded-lg border text-xs font-bold flex items-center justify-center transition cursor-pointer ${
                    idx === currentIndex
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {q.number}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <AiTutorModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        question={currentQ}
      />
    </div>
  );
}
