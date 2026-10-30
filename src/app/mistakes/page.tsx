"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/common/Header";
import ExportMistakesButton from "@/components/common/ExportMistakesButton";
import {
  getMistakeBank,
  MistakeItem,
  toggleMistakeMastered,
  deleteMistakeItem,
  clearAllMistakes,
} from "@/utils/mistakeBank";
import { getLocale, Locale } from "@/utils/i18n";
import {
  ArrowLeft,
  BookmarkCheck,
  CheckCircle2,
  Trash2,
  Sparkles,
  BookOpen,
  Filter,
} from "lucide-react";

export default function MistakesPage() {
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
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

  const filteredList = mistakes.filter((item) => {
    if (filterLevel !== "all" && item.level !== filterLevel) return false;
    if (filterStatus === "unmastered" && item.mastered) return false;
    if (filterStatus === "mastered" && !item.mastered) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Header
        title="Eloise의 HSK 맞춤 오답노트"
        subtitle="틀린 문항 자동 수집 · 한국어 심층 해설 및 단어장 복습"
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

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Top Control Bar */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                <BookmarkCheck className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-black text-slate-900">
                수험생 Eloise의 오답 복습장
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              총 {mistakes.length}개 오답 기록됨 · 미정복 문항: {mistakes.filter((m) => !m.mastered).length}개
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Level Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterLevel("all")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  filterLevel === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                }`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setFilterLevel(4)}
                className={`px-2.5 py-1 rounded-lg transition ${
                  filterLevel === 4 ? "bg-white text-red-600 shadow-xs" : "text-slate-500"
                }`}
              >
                HSK 4급
              </button>
              <button
                type="button"
                onClick={() => setFilterLevel(5)}
                className={`px-2.5 py-1 rounded-lg transition ${
                  filterLevel === 5 ? "bg-white text-blue-600 shadow-xs" : "text-slate-500"
                }`}
              >
                HSK 5급
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterStatus("unmastered")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  filterStatus === "unmastered" ? "bg-white text-rose-600 shadow-xs" : "text-slate-500"
                }`}
              >
                미완료만
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("mastered")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  filterStatus === "mastered" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-500"
                }`}
              >
                마스터 완료
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  filterStatus === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                }`}
              >
                전부
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
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                title="전체 오답노트 비우기"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mistakes List */}
        {filteredList.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
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
                  className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-xs transition ${
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
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(item.id)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition border ${
                          item.mastered
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700"
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{item.mastered ? "마스터됨" : "마스터 표시"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="이 오답 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Stem */}
                  <div className="text-base text-slate-900 leading-relaxed font-normal whitespace-pre-line mb-3 font-sans">
                    {q.content}
                  </div>

                  {/* Image if present */}
                  {q.image && (
                    <div className="my-2 p-2 bg-slate-50 border border-slate-200 rounded-xl inline-block max-w-full">
                      <img
                        src={q.image}
                        alt="插图"
                        className="max-h-40 max-w-full rounded object-contain"
                      />
                    </div>
                  )}

                  {/* Options */}
                  {q.options && Object.keys(q.options).length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      {Object.entries(q.options).map(([k, v]) => {
                        const isUser = item.userAnswer === k;
                        const isCor = item.correctAnswer === k;

                        let badge = "border-slate-200 bg-slate-50/50 text-slate-700";
                        if (isCor) badge = "border-emerald-300 bg-emerald-50 text-emerald-950 font-bold";
                        else if (isUser) badge = "border-rose-300 bg-rose-50 text-rose-950 font-bold";

                        return (
                          <div
                            key={k}
                            className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${badge}`}
                          >
                            <span className="font-bold w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center shrink-0">
                              {k}
                            </span>
                            <span className="pt-0.5">{v}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Answer Comparison */}
                  <div className="bg-slate-50 rounded-xl p-3 text-xs mb-3 flex flex-wrap items-center gap-4 border border-slate-200">
                    <div>
                      <span className="text-slate-400 font-medium">내가 작성한 답안: </span>
                      <span className="font-bold text-rose-600">{item.userAnswer}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">공식 표준 정답: </span>
                      <span className="font-bold text-emerald-600">{item.correctAnswer}</span>
                    </div>
                  </div>

                  {/* Korean Explanation */}
                  {q.explanationKo && (
                    <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 text-xs text-blue-950">
                      <div className="font-bold flex items-center gap-1.5 text-blue-900 mb-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>💡 한국어 상세 해설 & 출제 포인트:</span>
                      </div>
                      <div className="leading-relaxed whitespace-pre-line text-slate-700">
                        {q.explanationKo}
                      </div>
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
