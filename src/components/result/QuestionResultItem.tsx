"use client";

import React, { useState } from "react";
import { QuestionDetailResult } from "@/types/exam";
import { OptionKey } from "@/types/question";
import AiTutorModal from "@/components/tutor/AiTutorModal";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Bot,
} from "lucide-react";

interface QuestionResultItemProps {
  detail: QuestionDetailResult;
  index: number;
  locale: "ko" | "zh" | "bilingual";
}

export const QuestionResultItem: React.FC<QuestionResultItemProps> = ({ detail, index, locale }) => {
  const { question, userAnswer = "", effectiveAnswer = "", isCorrect, isUnanswered } = detail;
  const [expandDetail, setExpandDetail] = useState(true);
  const [showAiModal, setShowAiModal] = useState(false);

  const ALL_OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D", "E", "F"];
  const optionKeys = ALL_OPTION_KEYS.filter((k) => (question.options as any)?.[k] !== undefined);

  return (
    <div
      className={`bg-white rounded-2xl sm:rounded-3xl border p-4 sm:p-6 shadow-xs transition ${
        isCorrect
          ? "border-emerald-200"
          : isUnanswered
          ? "border-amber-200"
          : "border-rose-200"
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2.5 mb-3 sm:mb-4 pb-3 border-b border-slate-100 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center text-white ${
              isCorrect ? "bg-emerald-600" : isUnanswered ? "bg-amber-500" : "bg-rose-600"
            }`}
          >
            {question.number}
          </span>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg truncate max-w-[160px] sm:max-w-none">
            {locale === "zh" ? question.section : question.sectionKo || question.section}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Ask AI Tutor */}
          <button
            type="button"
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition"
            title="이 문제에 대해 AI 과외 질문하기"
          >
            <Bot className="w-3.5 h-3.5 text-purple-600" />
            <span>AI 과외</span>
          </button>

          {isCorrect ? (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{locale === "zh" ? "作答正确" : "정답"}</span>
            </span>
          ) : isUnanswered ? (
            <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>{locale === "zh" ? "未作答" : "미답안"}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>{locale === "zh" ? "作答错误" : "오답"}</span>
            </span>
          )}
        </div>
      </div>

      {/* Stem Content */}
      <div className="text-base sm:text-lg text-slate-900 leading-relaxed font-normal whitespace-pre-line mb-4 font-sans">
        {question.content}
      </div>

      {/* Image if present */}
      {question.image && (
        <div className="my-3 p-2 bg-slate-50 border border-slate-200 rounded-xl inline-block max-w-full">
          <img
            src={question.image}
            alt={`第 ${question.number} 题配图`}
            className="max-h-48 sm:max-h-52 max-w-full rounded object-contain"
          />
        </div>
      )}

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5 mb-4 sm:mb-5">
        {optionKeys.map((key) => {
          const optText = (question.options as any)[key];
          const optTextKo = (question.optionsKo as any)?.[key];
          const isUserChoice = userAnswer === key;
          const isTarget = effectiveAnswer === key;

          let badgeClass = "border-slate-200 bg-slate-50/60 text-slate-700";
          if (isTarget && isUserChoice) {
            badgeClass = "border-emerald-300 bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-300";
          } else if (isTarget && !isUserChoice) {
            badgeClass = "border-emerald-300 bg-emerald-50/50 text-emerald-900";
          } else if (isUserChoice && !isTarget) {
            badgeClass = "border-rose-300 bg-rose-50 text-rose-950 font-semibold ring-1 ring-rose-300";
          }

          return (
            <div
              key={key}
              className={`flex items-start gap-2.5 sm:gap-3 p-3 rounded-xl border text-xs sm:text-sm transition ${badgeClass}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  isTarget
                    ? "bg-emerald-600 text-white"
                    : isUserChoice && !isTarget
                    ? "bg-rose-600 text-white"
                    : "bg-white border border-slate-300 text-slate-700"
                }`}
              >
                {key}
              </div>
              <div className="flex-1 pt-0.5 min-w-0">
                <div>{optText}</div>
                {optTextKo && optTextKo !== optText && (
                  <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-sans">
                    {optTextKo}
                  </div>
                )}
              </div>
              {isUserChoice && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isTarget ? "bg-emerald-200 text-emerald-800" : "bg-rose-200 text-rose-800"
                  }`}
                >
                  {locale === "zh" ? "你的选择" : "내 선택"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Answer Comparison Box */}
      <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 border border-slate-200 text-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-4 sm:gap-6">
            <div>
              <span className="text-slate-500">{locale === "zh" ? "考生作答：" : "Eloise 답안："}</span>
              <span
                className={`font-black text-sm tracking-wide ${
                  isCorrect ? "text-emerald-600" : isUnanswered ? "text-slate-400" : "text-rose-600"
                }`}
              >
                {userAnswer || (locale === "zh" ? "未作答" : "미답안")}
              </span>
            </div>
            <div>
              <span className="text-slate-500">{locale === "zh" ? "官方标准正解：" : "공식 표준 정답："}</span>
              <span className="font-black text-sm text-blue-600 tracking-wide">
                {effectiveAnswer}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExpandDetail(!expandDetail)}
            className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1"
          >
            <span>{expandDetail ? "접기" : "한국어 심층 해설"}</span>
            {expandDetail ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Detailed Korean Explanation */}
        {expandDetail && (
          <div className="space-y-3 pt-1">
            {question.explanationKo && (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-line text-xs font-sans">
                <div className="font-bold text-red-600 mb-1.5 flex items-center gap-1">
                  <span>🇰🇷 한국어 정답 심층 분석 및 풀이 가이드:</span>
                </div>
                {question.explanationKo}
              </div>
            )}

            {/* Key Vocabulary Checklist */}
            {question.vocabList && question.vocabList.length > 0 && (
              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80">
                <div className="font-bold text-amber-900 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>핵심 어휘 단어장:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  {question.vocabList.map((v, i) => (
                    <div
                      key={i}
                      className="bg-white p-1.5 rounded-lg border border-amber-200/50 flex items-center justify-between"
                    >
                      <span className="font-bold text-slate-800">
                        {v.word} <span className="font-mono text-amber-700 font-normal">[{v.pinyin}]</span>
                      </span>
                      <span className="text-slate-600 truncate ml-2">{v.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Tutor Modal */}
      <AiTutorModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        question={question}
      />
    </div>
  );
};

export default QuestionResultItem;
