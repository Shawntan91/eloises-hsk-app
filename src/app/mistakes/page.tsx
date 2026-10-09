"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/common/Header";
import {
  getMistakeBank,
  MistakeItem,
  toggleMistakeMastered,
  deleteMistakeItem,
  clearAllMistakes,
  downloadMistakesAsMarkdown,
} from "@/utils/mistakeBank";
import { getLocale, Locale } from "@/utils/i18n";
import {
  ArrowLeft,
  BookmarkCheck,
  CheckCircle2,
  Trash2,
  Download,
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

  const handleExport = () => {
    downloadMistakesAsMarkdown(filteredList, "Eloise_HSK_맞춤_오답노트");
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

            {/* Markdown Export */}
            <button
              type="button"
              onClick={handleExport}
              disabled={filteredList.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs"
              title="Markdown 파일로 오답노트 다운로드"
            >
              <Download className="w-3.5 h-3.5" />
              <span>MD 다운로드</span>
            </button>
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
                    item.mastered ? "border-slate-200 opacity-70" : "border-rose-200"
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-rose-600 text-white font-bold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {item.examTitleKo || item.examTitle}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        · HSK {item.level}급 {q.sectionKo || q.section}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(item.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                          item.mastered
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{item.mastered ? "마스터 완료" : "마스터 표시"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
                        title="이 오답 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Stem Content */}
                  <div className="text-base text-slate-900 leading-relaxed font-normal whitespace-pre-line mb-4 font-sans">
                    {q.content}
                  </div>

                  {/* Image */}
                  {q.image && (
                    <div className="my-3 p-2 bg-slate-50 border border-slate-200 rounded-xl inline-block max-w-full">
                      <img
                        src={q.image}
                        alt="配图"
                        className="max-h-48 max-w-full rounded object-contain"
                      />
                    </div>
                  )}

                  {/* Answer Comparison */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center gap-6 mb-4">
                    <div>
                      <span className="text-slate-400">내 답안: </span>
                      <strong className="text-rose-600 text-sm font-bold">{item.userAnswer}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">공식 정답: </span>
                      <strong className="text-emerald-600 text-sm font-bold">{item.correctAnswer}</strong>
                    </div>
                  </div>

                  {/* Korean Explanation */}
                  {q.explanationKo && (
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-line mb-3 font-sans">
                      <div className="font-bold text-red-600 mb-1 flex items-center gap-1">
                        <span>💡 한국어 정답 해설 및 분석:</span>
                      </div>
                      {q.explanationKo}
                    </div>
                  )}

                  {/* Vocab Glossary */}
                  {q.vocabList && q.vocabList.length > 0 && (
                    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80">
                      <div className="font-bold text-amber-900 mb-1.5 flex items-center gap-1 text-xs">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>핵심 어휘 체크:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {q.vocabList.map((v, i) => (
                          <div
                            key={i}
                            className="bg-white p-1.5 rounded-lg border border-amber-200/50 flex items-center justify-between"
                          >
                            <span className="font-bold text-slate-800">
                              {v.word} <span className="font-mono text-amber-700 font-normal">[{v.pinyin}]</span>
                            </span>
                            <span className="text-slate-600">{v.meaning}</span>
                          </div>
                        ))}
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
