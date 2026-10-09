"use client";

import React, { useState, useRef, useEffect } from "react";
import { Exam } from "@/types/exam";
import { Question, OptionKey } from "@/types/question";
import AudioPlayerBar from "../AudioPlayerBar";
import { formatSeconds, getRemainingSeconds } from "@/utils/timer";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  Headphones,
  BookOpen,
  LayoutGrid,
  Sparkles,
  Columns,
  Clock,
} from "lucide-react";

interface IeltsExamLayoutProps {
  exam: Exam;
  currentIndex: number;
  onSelectQuestionIndex: (index: number) => void;
  onSelectAnswer: (ans: string) => void;
  onToggleMark: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSubmitClick: () => void;
  onToggleHskLayout: () => void;
  locale: "ko" | "zh" | "bilingual";
}

export const IeltsExamLayout: React.FC<IeltsExamLayoutProps> = ({
  exam,
  currentIndex,
  onSelectQuestionIndex,
  onSelectAnswer,
  onToggleMark,
  onPrev,
  onNext,
  onSubmitClick,
  onToggleHskLayout,
  locale,
}) => {
  const currentQ = exam.questions[currentIndex];
  const [leftPercent, setLeftPercent] = useState<number>(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const answeredCount = Object.keys(exam.answers).length;
  const isMarked = currentQ ? exam.markedQuestions.includes(currentQ.id) : false;
  const selectedAnswer = currentQ ? exam.answers[currentQ.id] : "";

  const optionKeys: OptionKey[] = ["A", "B", "C", "D", "E", "F"].filter(
    (k) => currentQ?.options && (currentQ.options as any)[k] !== undefined
  ) as OptionKey[];

  const remaining = getRemainingSeconds(exam.startTime || Date.now(), exam.duration);

  // Splitter dragging
  useEffect(() => {
    const handleMove = (clientX: number) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      setLeftPercent(Math.max(25, Math.min(75, pct)));
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-slate-900 text-slate-100 select-none font-sans">
      {/* 1. Top IELTS Header */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold text-xs">
            IELTS-STYLE HSK
          </span>
          <span className="text-sm font-bold truncate max-w-sm">
            {locale === "zh" ? exam.title : exam.titleKo || exam.title}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-lg text-amber-400 font-mono text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatSeconds(remaining)}</span>
          </div>

          <button
            type="button"
            onClick={onToggleHskLayout}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 text-xs font-bold rounded-lg transition"
            title="返回 HSK 官方标准机考界面"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{locale === "zh" ? "切回 HSK 机考" : "HSK CBT 복귀"}</span>
          </button>

          <button
            type="button"
            onClick={onSubmitClick}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{locale === "zh" ? "交卷" : "답안 제출"}</span>
          </button>
        </div>
      </header>

      {/* 2. Audio Bar if audio exists */}
      {exam.audioUrl && (
        <div className="px-4 py-1.5 bg-slate-900 border-b border-slate-800">
          <AudioPlayerBar audioUrl={exam.audioUrl} title={exam.title} />
        </div>
      )}

      {/* 3. Main Split Body */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        {/* Left Pane: Passage, Audio Material & Vocab */}
        <div
          style={{ width: `${leftPercent}%` }}
          className="h-full bg-slate-950 p-6 overflow-y-auto border-r border-slate-800"
        >
          <div className="max-w-xl mx-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>
                  {locale === "zh" ? "文本与听力材料对照区" : "지문 및 어휘 심층 대조"}
                </span>
              </span>
              <span className="text-[11px] text-slate-400">
                HSK {exam.level}级 · {currentQ?.partCategory}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-200 text-sm leading-relaxed whitespace-pre-line font-serif">
              {currentQ?.content}
            </div>

            {/* Image if present */}
            {currentQ?.image && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl inline-block max-w-full">
                <img
                  src={currentQ.image}
                  alt="配图"
                  className="max-h-56 max-w-full rounded object-contain"
                />
              </div>
            )}

            {/* Key Vocab */}
            {currentQ?.vocabList && currentQ.vocabList.length > 0 && (
              <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-4">
                <div className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>핵심 어휘 및 뜻풀이 (HSK Vocabulary):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {currentQ.vocabList.map((v, i) => (
                    <div
                      key={i}
                      className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between"
                    >
                      <span className="font-bold text-slate-200">
                        {v.word} <span className="text-amber-400/80">[{v.pinyin}]</span>
                      </span>
                      <span className="text-slate-400">{v.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Draggable Splitter */}
        <div
          onMouseDown={() => setIsDragging(true)}
          className="w-2 bg-slate-800 hover:bg-blue-600 cursor-col-resize flex items-center justify-center transition-colors flex-shrink-0"
        >
          <div className="w-0.5 h-8 bg-slate-600 rounded-full" />
        </div>

        {/* Right Pane: Options & Answering */}
        <div
          style={{ width: `${100 - leftPercent}%` }}
          className="h-full bg-slate-900 p-6 overflow-y-auto flex flex-col justify-between"
        >
          <div className="max-w-xl mx-auto w-full">
            <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-800">
              <span className="text-xs font-bold text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-800/40">
                第 {currentQ?.number} 题 · {currentQ?.section}
              </span>
              <button
                type="button"
                onClick={onToggleMark}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                  isMarked
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                    : "border-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                <Flag className={`w-3.5 h-3.5 ${isMarked ? "fill-amber-400 text-amber-400" : ""}`} />
                <span>{isMarked ? "已标记" : "标记"}</span>
              </button>
            </div>

            <div className="space-y-3">
              {optionKeys.map((k) => {
                const optText = (currentQ?.options as any)?.[k];
                const optTextKo = (currentQ?.optionsKo as any)?.[k];
                const isSelected = selectedAnswer === k;

                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => onSelectAnswer(k)}
                    className={`w-full text-left p-4 rounded-xl border flex items-start gap-4 transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-600/20 text-white shadow-xs"
                        : "border-slate-800 bg-slate-950/50 hover:border-slate-700 text-slate-300"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "border border-slate-700 bg-slate-900 text-slate-400"
                      }`}
                    >
                      {k}
                    </div>
                    <div className="flex-1 pt-0.5 text-sm">
                      <div>{optText}</div>
                      {optTextKo && optTextKo !== optText && (
                        <div className="text-xs text-slate-400 mt-0.5">{optTextKo}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-800 max-w-xl mx-auto w-full">
            <button
              type="button"
              onClick={onPrev}
              disabled={currentIndex === 0}
              className={`flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold ${
                currentIndex === 0 ? "text-slate-600 cursor-not-allowed" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>上一题</span>
            </button>
            <button
              type="button"
              onClick={onNext}
              className="flex items-center gap-1 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition"
            >
              <span>{currentIndex === exam.questions.length - 1 ? "完成交卷" : "下一题"}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom Navigator Strip */}
      <footer className="h-14 bg-slate-950 border-t border-slate-800 px-4 flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {exam.questions.map((q, idx) => {
            const isDone = !!exam.answers[q.id];
            const isCur = idx === currentIndex;
            const isM = exam.markedQuestions.includes(q.id);

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => onSelectQuestionIndex(idx)}
                className={`w-7 h-7 rounded text-xs font-bold flex items-center justify-center flex-shrink-0 transition relative ${
                  isCur
                    ? "bg-blue-500 text-white ring-2 ring-white"
                    : isDone
                    ? "bg-slate-800 text-blue-400 border border-blue-500/40"
                    : "bg-slate-900 text-slate-500 border border-slate-800 hover:border-slate-700"
                }`}
              >
                <span>{q.number}</span>
                {isM && <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
};

export default IeltsExamLayout;
