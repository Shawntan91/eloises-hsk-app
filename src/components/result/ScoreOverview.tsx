"use client";

import React from "react";
import { ExamResult } from "@/types/exam";
import { formatSeconds, formatRecentExamTitle } from "@/utils/timer";
import { Trophy, CheckCircle2, XCircle, Clock, Target, AlertTriangle, Sparkles, BookOpen } from "lucide-react";

interface ScoreOverviewProps {
  result: ExamResult;
  locale: "ko" | "zh" | "bilingual";
}

export const ScoreOverview: React.FC<ScoreOverviewProps> = ({ result, locale }) => {
  const isPass = result.isPassed;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
      {/* Top Banner: Pass or Not Pass */}
      <div
        className={`rounded-2xl p-5 sm:p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 border ${
          isPass
            ? "bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border-emerald-300"
            : "bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-amber-300"
        }`}
      >
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              isPass ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30" : "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
            }`}
          >
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  isPass ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
                }`}
              >
                {isPass ? (locale === "zh" ? "考核通过 (合格)" : "합격 (PASS)") : (locale === "zh" ? "继续加油" : "불합격 (RETRY)")}
              </span>
              <span className="text-xs font-bold text-slate-500">
                HSK {result.level}级 · 合格线 180分 / 300分
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {isPass
                ? locale === "zh"
                  ? "🎉 恭喜！Eloise 同学顺利通过本次 HSK 模考合格线！"
                  : "🎉 축하합니다! Eloise님께서 HSK 시험에 당당히 합격하셨습니다!"
                : locale === "zh"
                ? "💪 距离 180 分合格线还差一点，快去错题本针对性复习吧！"
                : "💪 아쉽게 기준 점수에 미치지 못했습니다. 오답노트로 복습해 보세요!"}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              {formatRecentExamTitle(result, locale)} · {locale === "zh" ? "考生: Eloise" : "수험생: Eloise (엘로이즈)"}
            </p>
          </div>
        </div>

        {/* Total Score Circle */}
        <div className="flex flex-col items-center justify-center bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-xs min-w-[140px]">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {locale === "zh" ? "总成绩 (满分300)" : "총점 (300점 만점)"}
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span
              className={`text-4xl font-black tracking-tight ${
                isPass ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {result.score}
            </span>
            <span className="text-xs text-slate-400 font-bold">/ 300</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            {isPass
              ? locale === "zh" ? "已达标 (180分+)" : "기준치(180점) 통과"
              : locale === "zh" ? "未达 180 分合格线" : "180점 기준 미달"}
          </span>
        </div>
      </div>

      {/* 3 Section Score Cards: 听力, 阅读, 书写 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {result.sectionScores.map((sec) => (
          <div
            key={sec.partCategory}
            className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>{locale === "zh" ? sec.partCategory : sec.partCategoryKo}</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                {locale === "zh" ? "满分 100" : "만점 100"}
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-1 mb-2">
              <span className="text-2xl font-black text-slate-900">{sec.score} {locale === "zh" ? "分" : "점"}</span>
              <span className="text-xs text-slate-500">
                {locale === "zh" ? "答对" : "정답"}: <strong>{sec.correct}</strong> / {sec.total} {locale === "zh" ? "题" : "문항"}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  sec.score >= 60 ? "bg-emerald-500" : "bg-amber-500"
                }`}
                style={{ width: `${Math.min(100, sec.score)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div className="text-[11px] text-slate-400 font-bold">{locale === "zh" ? "全卷正确率" : "전체 정답률 (正确率)"}</div>
          <div className="text-lg font-black text-blue-600 mt-0.5">{result.accuracyRate}%</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div className="text-[11px] text-slate-400 font-bold">{locale === "zh" ? "错题与未答" : "오답 및 미답안 (错题)"}</div>
          <div className="text-lg font-black text-rose-600 mt-0.5">
            {result.wrongCount + result.unansweredCount} {locale === "zh" ? "道" : "문항"}
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div className="text-[11px] text-slate-400 font-bold">{locale === "zh" ? "总答题用时" : "총 소요 시간 (答题用时)"}</div>
          <div className="text-lg font-black text-slate-700 mt-0.5 font-mono">
            {formatSeconds(result.timeSpentSeconds, locale)}
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div className="text-[11px] text-slate-400 font-bold">{locale === "zh" ? "题均耗时" : "문항당 평균 (题均用时)"}</div>
          <div className="text-lg font-black text-slate-700 mt-0.5 font-mono">
            {result.avgSecondsPerQuestion} {locale === "zh" ? "秒" : "초"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreOverview;
