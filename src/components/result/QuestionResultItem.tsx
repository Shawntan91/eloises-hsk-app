"use client";

import React, { useState } from "react";
import { QuestionDetailResult } from "@/types/exam";
import { OptionKey } from "@/types/question";
import AiTutorModal from "@/components/tutor/AiTutorModal";
import MarkdownText, { sanitizeExplanationText } from "@/components/common/MarkdownText";
import ListeningShadowing from "@/components/exam/ListeningShadowing";
import { formatSeconds } from "@/utils/timer";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Bot,
  Volume2,
  FileText,
  PenTool,
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
  const [showTranscript, setShowTranscript] = useState(false);

  const ALL_OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D", "E", "F"];
  const optionKeys = ALL_OPTION_KEYS.filter((k) => (question.options as any)?.[k] !== undefined);

  const handleJumpAudio = (sec?: number) => {
    if (typeof sec === "number" && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("seek-audio-time", { detail: { time: sec } }));
    }
  };

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

          {typeof question.audioTimestamp === "number" && (
            <button
              type="button"
              onClick={() => handleJumpAudio(question.audioTimestamp)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 transition cursor-pointer"
              title={locale === "zh" ? "跳转到对应音频位置" : "오디오 해당 구간으로 이동"}
            >
              <Volume2 className="w-3.5 h-3.5 text-red-600" />
              <span>{formatSeconds(question.audioTimestamp)} {locale === "zh" ? "播放" : "재생"}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Ask AI Tutor */}
          <button
            type="button"
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition cursor-pointer"
            title={locale === "zh" ? "向 AI 导师提问此题" : "이 문제에 대해 AI 과외 질문하기"}
          >
            <Bot className="w-3.5 h-3.5 text-purple-600" />
            <span>{locale === "zh" ? "AI 导师" : "AI 과외"}</span>
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

      {/* Listening Transcript */}
      {question.transcript && (
        <div className="mb-4 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/80">
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full flex items-center justify-between px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-red-600" />
              <span>
                {showTranscript
                  ? locale === "zh" ? "收起听力录音原文" : "듣기 대본 원문 닫기"
                  : locale === "zh" ? "查看听力录音原文(对话)" : "듣기 녹음 원문(대화) 확인하기"}
              </span>
            </span>
            {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showTranscript && (
            <div className="px-3.5 py-3 bg-white border-t border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
              <div className="whitespace-pre-line mb-3">
                {question.transcript}
              </div>
              <ListeningShadowing transcript={question.transcript} />
            </div>
          )}
        </div>
      )}

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

      {/* 1. 连词成句 Review */}
      {question.type === "order_words" && (
        <div className="mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs sm:text-sm">
          <div>
            <span className="text-slate-400 font-medium">{locale === "zh" ? "我的造句: " : "내가 조립한 문장: "}</span>
            <span className={`font-bold ${isCorrect ? "text-emerald-700" : "text-rose-600"}`}>
              {userAnswer || (locale === "zh" ? "（未作答）" : "（미작성）")}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-medium">{locale === "zh" ? "标准答案句: " : "표준 정답 문장: "}</span>
            <span className="font-bold text-emerald-700">
              {question.standardSentence || effectiveAnswer}
            </span>
          </div>
        </div>
      )}

      {/* 1. 看图造句 / 写作 Review */}
      {question.type === "image_writing" && (
        <div className="mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs sm:text-sm">
          <div>
            <span className="text-slate-400 font-medium">{locale === "zh" ? "我的作答: " : "내가 작성한 답안: "}</span>
            <div className={`p-3 rounded-xl mt-1 font-medium bg-white border ${
              isCorrect ? "border-emerald-200 text-slate-800" : "border-rose-200 text-rose-900"
            }`}>
              {userAnswer || (locale === "zh" ? "（未作答）" : "（미작성）")}
            </div>
          </div>
          <div>
            <span className="text-slate-400 font-medium">{locale === "zh" ? "参考范文: " : "모범 예시 답안 (참고 문장): "}</span>
            <div className="p-3 rounded-xl mt-1 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
              {question.referenceEssay || effectiveAnswer}
            </div>
          </div>
        </div>
      )}

      {/* Choice Options Grid */}
      {question.type !== "order_words" && question.type !== "image_writing" && optionKeys.length > 0 && (
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
                {isTarget && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                    {locale === "zh" ? "正解" : "정답"}
                  </span>
                )}
                {isUserChoice && !isTarget && (
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded shrink-0">
                    {locale === "zh" ? "我的作答" : "내 답"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Korean In-Depth Explanation & Vocabulary */}
      {expandDetail && (
        <div className="space-y-3 pt-3 border-t border-slate-100 text-xs sm:text-sm">
          {question.explanationKo ? (
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 sm:p-4 text-blue-950">
              <div className="font-bold flex items-center gap-1.5 text-blue-900 mb-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>
                  {locale === "zh"
                    ? "💡 Eloise 专属深度解析与考点精讲:"
                    : "💡 Eloise를 위한 한국어 심층 해설 & 출제 의도:"}
                </span>
              </div>
              <div className="leading-relaxed text-slate-700 font-sans">
                <MarkdownText
                  content={sanitizeExplanationText(question.explanationKo, {
                    type: question.type,
                    number: question.number,
                    standardSentence: question.standardSentence,
                    referenceEssay: question.referenceEssay,
                    officialAnswer: question.officialAnswer || effectiveAnswer,
                    options: question.options as any,
                  })}
                />
              </div>
            </div>
          ) : question.explanation ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800">
              <div className="font-bold text-slate-900 mb-1">【解析】</div>
              <MarkdownText content={question.explanation} />
            </div>
          ) : null}

          {/* Key Vocab list */}
          {question.vocabList && question.vocabList.length > 0 && (
            <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-3 sm:p-3.5">
              <div className="font-bold text-amber-900 text-xs mb-2 flex items-center gap-1">
                <span>{locale === "zh" ? "📚 核心词汇与拼音:" : "📚 필수 어휘 및 병음:"}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                {question.vocabList.map((v, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/80 p-1.5 rounded-lg border border-amber-200/50">
                    <span className="font-bold text-slate-800">
                      {v.word} <span className="text-amber-700 font-mono">[{v.pinyin}]</span>
                    </span>
                    <span className="text-slate-600 ml-2">{v.meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
