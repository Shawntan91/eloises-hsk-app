"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/common/Header";
import ScoreOverview from "@/components/result/ScoreOverview";
import ScoreTrendChart from "@/components/result/ScoreTrendChart";
import QuestionResultItem from "@/components/result/QuestionResultItem";
import ExportMistakesButton from "@/components/common/ExportMistakesButton";
import { ExamResult } from "@/types/exam";
import { loadExamResult } from "@/utils/storage";
import { convertQuestionDetailsToMistakes } from "@/utils/mistakeBank";
import { getLocale, Locale } from "@/utils/i18n";
import { formatRecentExamTitle } from "@/utils/timer";
import { ArrowLeft, BookOpen, BookmarkCheck, Loader2 } from "lucide-react";

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params?.id as string;

  const [result, setResult] = useState<ExamResult | null>(null);
  const [filterWrongOnly, setFilterWrongOnly] = useState(false);
  const [locale, setLocale] = useState<Locale>("ko");

  useEffect(() => {
    setLocale(getLocale());
    const handleLocaleChange = () => setLocale(getLocale());
    window.addEventListener("hsk-locale-changed", handleLocaleChange);

    if (examId) {
      const loaded = loadExamResult(examId);
      if (!loaded) {
        router.replace("/");
      } else {
        setResult(loaded);
      }
    }

    return () => window.removeEventListener("hsk-locale-changed", handleLocaleChange);
  }, [examId, router]);

  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen text-slate-500">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-red-600" />
          <span>正在加载 HSK 成绩分析报告...</span>
        </div>
      </div>
    );
  }

  const wrongDetails = result.questionDetails.filter((d) => !d.isCorrect);
  const displayedQuestions = filterWrongOnly ? wrongDetails : result.questionDetails;
  const localizedTitle = formatRecentExamTitle(result, locale);

  const mistakesForExport = convertQuestionDetailsToMistakes(
    result.examId,
    localizedTitle,
    result.level || 4,
    wrongDetails
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Header
        title={locale === "zh" ? "HSK 成绩单与深度解析" : "HSK 성적표 & 상세 해설"}
        subtitle={locale === "zh" ? "300 分满分制分项成绩单与逐题精讲" : "300점 만점 영역별 성적표 및 한국어 심층 해설"}
        rightElement={
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{locale === "zh" ? "返回首页" : "홈으로"}</span>
          </Link>
        }
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Score Overview */}
        <ScoreOverview result={result} locale={locale} />

        {/* Score Trend & Share Card (F8) */}
        <ScoreTrendChart currentResult={result} locale={locale} />

        {/* Question Review Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-red-600" />
            <h3 className="font-extrabold text-slate-900 text-lg">
              {locale === "zh" ? "题目作答明细与权威解析" : "문항별 답안 분석 & 한국어 해설"}
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              ({displayedQuestions.length} / {result.totalQuestions} {locale === "zh" ? "题" : "문항"})
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Filter Toggle */}
            <button
              type="button"
              onClick={() => setFilterWrongOnly(!filterWrongOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                filterWrongOnly
                  ? "bg-rose-50 text-rose-700 border-rose-300"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {filterWrongOnly
                ? locale === "zh"
                  ? `当前：仅看错题 (${result.wrongCount + result.unansweredCount}题)`
                  : `보기: 오답만 보기 (${result.wrongCount + result.unansweredCount}개)`
                : locale === "zh"
                ? "查看全部题目"
                : "전체 문항 보기"}
            </button>

            {/* Export mistakes from this exam */}
            {mistakesForExport.length > 0 && (
              <ExportMistakesButton
                items={mistakesForExport}
                title={`${localizedTitle}_${locale === "zh" ? "错题" : "오답"}`}
                locale={locale}
                variant="secondary"
              />
            )}

            {/* Link to Mistakes Notebook */}
            <Link
              href="/mistakes"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition"
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>{locale === "zh" ? "进入错题本" : "오답노트 이동"}</span>
            </Link>
          </div>
        </div>

        {/* Detailed Question Review List */}
        <div className="space-y-4">
          {displayedQuestions.map((detail, idx) => (
            <QuestionResultItem
              key={detail.question.id}
              detail={detail}
              index={idx}
              locale={locale}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
