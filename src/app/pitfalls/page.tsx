"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/common/Header";
import errorBankData from "@/data/errorBank.json";
import { PitfallQuestion, PitfallCategory } from "@/types/pitfall";
import { recordPitfallPractice, getCategoryStatList } from "@/utils/pitfallStats";
import { savePitfallMistake } from "@/utils/mistakeBank";
import { getLocale, Locale } from "@/utils/i18n";
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  BookmarkCheck,
  ChevronRight,
  Award,
  Layers,
  BookOpen,
  Sliders,
  AlertTriangle,
} from "lucide-react";

export default function PitfallsPage() {
  const [locale, setLocale] = useState<Locale>("ko");
  const [selectedCategory, setSelectedCategory] = useState<PitfallCategory | "all">("all");
  const [roundStarted, setRoundStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [roundQuestions, setRoundQuestions] = useState<PitfallQuestion[]>([]);
  const [roundAnswers, setRoundAnswers] = useState<
    Array<{
      question: PitfallQuestion;
      userAnswer: string;
      isCorrect: boolean;
    }>
  >([]);
  const [roundFinished, setRoundFinished] = useState(false);
  const [stats, setStats] = useState(getCategoryStatList());

  const isZh = locale === "zh";
  const allBank = errorBankData as PitfallQuestion[];

  useEffect(() => {
    setLocale(getLocale());
    const handleLocaleChange = () => setLocale(getLocale());
    window.addEventListener("hsk-locale-changed", handleLocaleChange);
    return () => window.removeEventListener("hsk-locale-changed", handleLocaleChange);
  }, []);

  const handleStartRound = () => {
    let pool = allBank;
    if (selectedCategory !== "all") {
      pool = allBank.filter((q) => q.category === selectedCategory);
    }
    // Shuffle pool
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);

    setRoundQuestions(selected);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setRoundAnswers([]);
    setRoundFinished(false);
    setRoundStarted(true);
  };

  const handleChooseOption = (optKey: string) => {
    if (selectedAnswer !== null) return; // already answered
    const curQ = roundQuestions[currentIndex];
    setSelectedAnswer(optKey);

    const isCorrect = optKey === curQ.answer;

    // Save mistake if wrong
    if (!isCorrect) {
      savePitfallMistake(curQ, optKey);
    }

    setRoundAnswers((prev) => [
      ...prev,
      {
        question: curQ,
        userAnswer: optKey,
        isCorrect,
      },
    ]);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < roundQuestions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
    } else {
      // Finish round
      const resultsToRecord = roundAnswers.map((a) => ({
        category: a.question.category,
        isCorrect: a.isCorrect,
      }));
      recordPitfallPractice(resultsToRecord, 90);
      setStats(getCategoryStatList());
      setRoundFinished(true);
    }
  };

  const currentQ = roundQuestions[currentIndex];

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Header
        title={isZh ? "韩国人易错专项强化" : "한국인 취약점 집중 훈련"}
        subtitle={
          isZh
            ? "声调变调 · 专用量词 · 把字句 · 被字句 · 了/过 专项特训"
            : "성조 변조 · 전용 양사 · ‘把’자문 · ‘被’자문 · ‘了/过’ 한중 대조 특훈"
        }
        rightElement={
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isZh ? "返回首页" : "홈으로"}</span>
          </Link>
        }
      />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        {!roundStarted ? (
          /* Selection & Dashboard View */
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-rose-600 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-white/20 border border-white/30 backdrop-blur-xs">
                  {isZh ? "高频踩坑深度剖析" : "한국인 특화 취약점"}
                </span>
                <span className="text-xs font-bold text-purple-200">
                  {isZh ? "共收录经典辨析例题" : "엄선된 필수 핵심 기출"}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
                {isZh ? "韩国人学中文最容易错的 5 大专项" : "한국인이 가장 많이 틀리는 5대 문법·어법"}
              </h2>
              <p className="text-xs sm:text-sm text-purple-100 max-w-xl leading-relaxed">
                {isZh
                  ? "汉韩对比讲解：直击声调变调、量词差异、把/被字句语序、了与过的体貌误区，彻底告别母语负迁移！"
                  : "모국어 간섭(Negative Transfer)으로 인해 한국인이 무의식적으로 범하는 5대 오류를 한국어 해설과 함께 집중 정복합니다."}
              </p>
            </div>

            {/* Category selection */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-sm sm:text-base font-black text-slate-900 mb-3 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-600" />
                <span>{isZh ? "选择专项练习题型" : "연습할 취약점 영역 선택"}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                    selectedCategory === "all"
                      ? "border-purple-600 bg-purple-50/70 ring-2 ring-purple-600/20"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/60"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {isZh ? "🎲 全分类混合抽练 (10题)" : "🎲 전체 영역 종합 랜덤 (10문항)"}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isZh ? "随机混抽 5 大易错题型" : "5대 취약점 골고루 출제"}
                    </span>
                  </div>
                  {selectedCategory === "all" && (
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                  )}
                </button>

                {stats.map((s) => (
                  <button
                    key={s.category}
                    type="button"
                    onClick={() => setSelectedCategory(s.category)}
                    className={`p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                      selectedCategory === s.category
                        ? "border-purple-600 bg-purple-50/70 ring-2 ring-purple-600/20"
                        : "border-slate-200 hover:border-slate-300 bg-slate-50/60"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {isZh ? s.categoryNameZh : s.categoryNameKo}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {isZh
                          ? `已练 ${s.totalPracticed} 题 · 正确率 ${s.accuracyRate}%`
                          : `풀이 ${s.totalPracticed}문항 · 정답률 ${s.accuracyRate}%`}
                      </span>
                    </div>
                    {selectedCategory === s.category && (
                      <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 flex-wrap gap-3">
                <span className="text-xs text-slate-500">
                  {isZh
                    ? "每轮 10 道题目 · 错题将自动收入个人错题本标有「易错专项」标签"
                    : "한 라운드당 10문항 · 오답은 자동으로 오답노트에 저장됩니다"}
                </span>

                <button
                  type="button"
                  onClick={handleStartRound}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-black shadow-md shadow-purple-500/25 flex items-center gap-2 cursor-pointer transition active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isZh ? "开始 10 题专项强化" : "취약점 10문항 훈련 시작"}</span>
                </button>
              </div>
            </div>
          </div>
        ) : roundFinished ? (
          /* Round Result View */
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-purple-100 text-purple-700 mx-auto flex items-center justify-center">
              <Award className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                {isZh ? "本轮易错专项特训完成！" : "취약점 집중 훈련 완료!"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isZh
                  ? `本次答对 ${roundAnswers.filter((a) => a.isCorrect).length} / ${roundAnswers.length} 题 · 正确率 ${Math.round(
                      (roundAnswers.filter((a) => a.isCorrect).length / roundAnswers.length) * 100
                    )}%`
                  : `정답: ${roundAnswers.filter((a) => a.isCorrect).length} / ${roundAnswers.length}문항 (정답률 ${Math.round(
                      (roundAnswers.filter((a) => a.isCorrect).length / roundAnswers.length) * 100
                    )}%)`}
              </p>
            </div>

            {/* Category breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-lg mx-auto">
              {stats.map((s) => (
                <div key={s.category} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex justify-between font-bold text-slate-800 mb-1">
                    <span>{isZh ? s.categoryNameZh : s.categoryNameKo}</span>
                    <span className="text-purple-600">{s.accuracyRate}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full"
                      style={{ width: `${s.accuracyRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100 flex-wrap">
              <button
                type="button"
                onClick={handleStartRound}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition"
              >
                {isZh ? "再练一轮" : "한 번 더 풀기"}
              </button>
              <Link
                href="/mistakes"
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5"
              >
                <BookmarkCheck className="w-4 h-4 text-rose-600" />
                <span>{isZh ? "查看易错专项错题" : "오답노트에서 확인"}</span>
              </Link>
              <button
                type="button"
                onClick={() => setRoundStarted(false)}
                className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 font-bold text-xs transition"
              >
                {isZh ? "返回分类选择" : "유형 선택으로"}
              </button>
            </div>
          </div>
        ) : (
          /* Question Quiz View */
          currentQ && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
              {/* Top status */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center justify-center font-mono">
                    #{currentIndex + 1}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    {isZh ? currentQ.categoryNameZh : currentQ.categoryNameKo}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {currentIndex + 1} / {roundQuestions.length}
                </span>
              </div>

              {/* Question Stem */}
              <div className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed font-sans">
                {currentQ.question}
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {currentQ.options.map((opt) => {
                  const optKey = opt.trim().slice(0, 1).toUpperCase();
                  const isSelected = selectedAnswer === optKey;
                  const isTarget = currentQ.answer === optKey;

                  let style = "border-slate-200 bg-slate-50/70 hover:bg-white text-slate-800";
                  if (selectedAnswer !== null) {
                    if (isTarget) {
                      style = "border-emerald-400 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-400";
                    } else if (isSelected && !isTarget) {
                      style = "border-rose-400 bg-rose-50 text-rose-950 font-bold ring-1 ring-rose-400";
                    } else {
                      style = "border-slate-200 bg-slate-50 text-slate-400 opacity-60";
                    }
                  }

                  return (
                    <button
                      key={optKey}
                      type="button"
                      disabled={selectedAnswer !== null}
                      onClick={() => handleChooseOption(optKey)}
                      className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between text-xs sm:text-sm cursor-pointer ${style}`}
                    >
                      <span>{opt}</span>
                      {selectedAnswer !== null && isTarget && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      {selectedAnswer !== null && isSelected && !isTarget && (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation Card upon answering */}
              {selectedAnswer !== null && (
                <div className="space-y-3 pt-3 animate-in fade-in duration-200">
                  <div
                    className={`p-3.5 rounded-2xl border text-xs sm:text-sm ${
                      selectedAnswer === currentQ.answer
                        ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                        : "bg-rose-50/80 border-rose-200 text-rose-950"
                    }`}
                  >
                    <div className="font-bold mb-1 flex items-center gap-1.5">
                      {selectedAnswer === currentQ.answer ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{isZh ? "回答正确！" : "정답입니다!"}</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>{isZh ? `回答错误，正确答案是 ${currentQ.answer}` : `오답입니다. 정답은 ${currentQ.answer}번입니다.`}</span>
                        </>
                      )}
                    </div>
                    <p className="leading-relaxed whitespace-pre-line text-slate-700 mt-2 font-sans">
                      {isZh ? currentQ.explanation_zh : currentQ.explanation_ko}
                    </p>
                  </div>

                  {/* Why Koreans make mistakes tip */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs sm:text-sm leading-relaxed font-sans">
                    {currentQ.tip}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{currentIndex + 1 < roundQuestions.length ? (isZh ? "下一题" : "다음 문제") : (isZh ? "查看本轮报告" : "결과 확인")}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </main>
    </div>
  );
}
