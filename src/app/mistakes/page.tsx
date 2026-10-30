"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/common/Header";
import ExportMistakesButton from "@/components/common/ExportMistakesButton";
import MarkdownText from "@/components/common/MarkdownText";
import {
  getMistakeBank,
  MistakeItem,
  toggleMistakeMastered,
  deleteMistakeItem,
  clearAllMistakes,
} from "@/utils/mistakeBank";
import { saveActiveExam } from "@/utils/storage";
import { Exam } from "@/types/exam";
import { Question } from "@/types/question";
import { getLocale, Locale } from "@/utils/i18n";
import {
  ArrowLeft,
  BookmarkCheck,
  CheckCircle2,
  Trash2,
  Sparkles,
  BookOpen,
  Filter,
  Play,
  RotateCcw,
  Layers,
  GraduationCap,
} from "lucide-react";

export default function MistakesPage() {
  const router = useRouter();
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [filterSource, setFilterSource] = useState<"all" | "exam" | "word">("all");
  const [filterLevel, setFilterLevel] = useState<number | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "unmastered" | "mastered">("unmastered");
  const [locale, setLocale] = useState<Locale>("ko");

  useEffect(() => {
    setLocale(getLocale());
    setMistakes(getMistakeBank());

    const handleChange = () => {
      setMistakes(getMistakeBank());
    };
    window.addEventListener("mistake-bank-changed", handleChange);
    return () => window.removeEventListener("mistake-bank-changed", handleChange);
  }, []);

  const handleToggle = (id: string) => {
    toggleMistakeMastered(id);
    setMistakes(getMistakeBank());
  };

  const handleDelete = (id: string) => {
    deleteMistakeItem(id);
    setMistakes(getMistakeBank());
  };

  const handleClear = () => {
    if (window.confirm("모든 오답 노트를 비우시겠습니까?")) {
      clearAllMistakes();
      setMistakes([]);
    }
  };

  // Filter list
  const filteredList = mistakes.filter((item) => {
    if (filterSource === "exam" && item.sourceType === "word") return false;
    if (filterSource === "word" && item.sourceType !== "word") return false;
    if (filterLevel !== "all" && item.level !== filterLevel) return false;
    if (filterStatus === "unmastered" && item.mastered) return false;
    if (filterStatus === "mastered" && !item.mastered) return false;
    return true;
  });

  // F3: Generate mistake review exam
  const handleStartMistakesExam = () => {
    const unmastered = filteredList.filter((m) => !m.mastered);
    if (unmastered.length === 0) {
      alert("풀이할 미완료 오답 문항이 없습니다!");
      return;
    }

    const questions: Question[] = unmastered.map((m, idx) => ({
      ...m.question,
      id: m.question.id || `mistake_q_${idx}`,
      number: idx + 1,
    }));

    const examId = `mistake-exam-${Date.now()}`;
    const customExam: Exam = {
      id: examId,
      level: 4,
      title: "오답노트 맞춤 재시험 (错题重练卷)",
      titleKo: "오답 맞춤 복습 시험",
      subTitle: `${questions.length}문항 · 2회 연속 정답 시 자동 마스터`,
      subTitleKo: `${questions.length}문항 · 2회 연속 정답 시 자동 마스터`,
      tag: "MISTAKE_REVIEW",
      tagKo: "오답재시험",
      questions,
      duration: questions.length * 90, // 1.5 mins per question
      startTime: Date.now(),
      answers: {},
      markedQuestions: [],
      currentQuestion: 0,
      status: "in_progress",
      answerMode: "practice", // practice mode with instant feedback
    };

    saveActiveExam(customExam);
    router.push(`/exam/${examId}`);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Header
        title="Eloise의 HSK 맞춤 오답노트"
        subtitle="모의고사 & 단어 퀴즈 오답 자동 통합 · 실시간 2회 정답 마스터 연동"
        rightElement={
          <Link
            href="/"
            className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white/90 border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>홈으로</span>
          </Link>
        }
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Top Control Bar */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-200 p-6 shadow-xs mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                <BookmarkCheck className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-black text-slate-900">
                수험생 Eloise의 오답 복습장 📕
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              총 {mistakes.length}개 오답 기록됨 · 미정복 문항:{" "}
              {mistakes.filter((m) => !m.mastered).length}개
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* F3: One-click Re-Exam Button */}
            {filteredList.filter((m) => !m.mastered).length > 0 && (
              <button
                type="button"
                onClick={handleStartMistakesExam}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>오답 맞춤 시험 생성 ({filteredList.filter((m) => !m.mastered).length}문제)</span>
              </button>
            )}

            {/* Source Tab Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterSource("all")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  filterSource === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                }`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setFilterSource("exam")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  filterSource === "exam" ? "bg-white text-red-600 shadow-xs" : "text-slate-500"
                }`}
              >
                모의고사
              </button>
              <button
                type="button"
                onClick={() => setFilterSource("word")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  filterSource === "word" ? "bg-white text-amber-600 shadow-xs" : "text-slate-500"
                }`}
              >
                단어 퀴즈
              </button>
            </div>

            {/* Level Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterLevel("all")}
                className={`px-2 py-1 rounded-lg transition ${
                  filterLevel === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                }`}
              >
                전체급수
              </button>
              <button
                type="button"
                onClick={() => setFilterLevel(4)}
                className={`px-2 py-1 rounded-lg transition ${
                  filterLevel === 4 ? "bg-white text-red-600 shadow-xs" : "text-slate-500"
                }`}
              >
                4급
              </button>
              <button
                type="button"
                onClick={() => setFilterLevel(5)}
                className={`px-2 py-1 rounded-lg transition ${
                  filterLevel === 5 ? "bg-white text-blue-600 shadow-xs" : "text-slate-500"
                }`}
              >
                5급
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterStatus("unmastered")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  filterStatus === "unmastered"
                    ? "bg-white text-rose-600 shadow-xs"
                    : "text-slate-500"
                }`}
              >
                미완료만
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("mastered")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  filterStatus === "mastered"
                    ? "bg-white text-emerald-600 shadow-xs"
                    : "text-slate-500"
                }`}
              >
                마스터 완료
              </button>
            </div>

            {/* Multi-format Export Button */}
            <ExportMistakesButton
              items={filteredList}
              title="Eloise_HSK_맞춤_오답노트"
              locale={locale}
            />

            {/* Clear All */}
            {mistakes.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                title="전체 오답노트 비우기"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mistakes List */}
        {filteredList.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="font-bold text-slate-700 text-base mb-1">
              해당 조건의 오답 문항이 없습니다!
            </h4>
            <p className="text-xs text-slate-400">
              모의고사를 치르거나 필터를 변경하여 확인해 보세요.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredList.map((item, idx) => {
              const q = item.question;

              return (
                <div
                  key={item.id}
                  className={`bg-white/90 backdrop-blur-sm rounded-2xl border p-5 sm:p-6 shadow-xs transition ${
                    item.mastered ? "border-slate-200 opacity-75" : "border-rose-200"
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-red-600 text-white font-bold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                        HSK {item.level}급 · {q.sectionKo || q.section}
                      </span>
                      <span className="text-xs text-slate-400 hidden sm:inline">
                        《{item.examTitleKo || item.examTitle}》
                      </span>
                      {item.sourceType === "word" && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                          단어 퀴즈 오답
                        </span>
                      )}
                      {typeof item.streak === "number" && item.streak > 0 && !item.mastered && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">
                          🔥 연속 {item.streak}회 정답 (2회 달성 시 자동 마스터)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(item.id)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition border cursor-pointer ${
                          item.mastered
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700"
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{item.mastered ? "마스터됨" : "마스터 완료"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="이 오답 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Stem Content */}
                  <div className="text-sm sm:text-base text-slate-900 leading-relaxed font-normal whitespace-pre-line mb-3">
                    {q.content}
                  </div>

                  {/* Choices */}
                  {q.options && Object.keys(q.options).length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3">
                      {Object.entries(q.options).map(([k, v]) => {
                        const isUser = item.userAnswer === k;
                        const isCor = item.correctAnswer === k;

                        let style = "border-slate-200 bg-slate-50/70 text-slate-700";
                        if (isCor) {
                          style = "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold";
                        } else if (isUser && !isCor) {
                          style = "border-rose-500 bg-rose-50 text-rose-900 font-bold";
                        }

                        return (
                          <div
                            key={k}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${style}`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full border border-slate-300 bg-white flex items-center justify-center font-bold text-[11px]">
                                {k}
                              </span>
                              <span>{v}</span>
                            </span>
                            {isCor && <span className="text-[10px] text-emerald-700 font-bold">정답</span>}
                            {isUser && !isCor && <span className="text-[10px] text-rose-700 font-bold">내 답안</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Answer Summary */}
                  <div className="flex items-center gap-4 text-xs font-mono py-2 text-slate-600 bg-slate-50/80 px-3 rounded-xl mb-3 flex-wrap">
                    <span>
                      내 제출 답:{" "}
                      <strong className="text-rose-600 font-bold">{item.userAnswer}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      표준 정답:{" "}
                      <strong className="text-emerald-600 font-bold">{item.correctAnswer}</strong>
                    </span>
                  </div>

                  {/* Explanation with Markdown formatting */}
                  {q.explanationKo && (
                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-slate-800 space-y-1">
                      <div className="font-bold text-amber-900 flex items-center gap-1 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>💡 한국어 심층 해설:</span>
                      </div>
                      <MarkdownText content={q.explanationKo} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
