"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/common/Header";
import hskExamsData from "@/data/hskExams.json";
import { getRecentExams, RecentExamItem, deleteRecentExam } from "@/utils/storage";
import { getMasteredWordNos } from "@/utils/wordStorage";
import { getLocale, Locale } from "@/utils/i18n";
import {
  Sparkles,
  Headphones,
  BookOpen,
  Award,
  Play,
  RotateCcw,
  CheckCircle2,
  Trash2,
  ChevronRight,
  Flame,
  BookmarkCheck,
  Languages,
  Clock,
  Layers,
  ArrowRight,
  Bot,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [recents, setRecents] = useState<RecentExamItem[]>([]);
  const [locale, setLocale] = useState<Locale>("ko");
  const [masteredWordCount, setMasteredWordCount] = useState(0);

  useEffect(() => {
    setLocale(getLocale());
    setRecents(getRecentExams());
    setMasteredWordCount(getMasteredWordNos().length);

    const handleLocaleChange = () => setLocale(getLocale());
    const handleWordChange = () => setMasteredWordCount(getMasteredWordNos().length);
    window.addEventListener("hsk-locale-changed", handleLocaleChange);
    window.addEventListener("word-progress-changed", handleWordChange);
    return () => {
      window.removeEventListener("hsk-locale-changed", handleLocaleChange);
      window.removeEventListener("word-progress-changed", handleWordChange);
    };
  }, []);

  const handleDeleteRecent = (id: string) => {
    deleteRecentExam(id);
    setRecents(getRecentExams());
  };

  const hsk4Exams = (hskExamsData as any[]).filter((e) => e.level === 4);
  const hsk5Exams = (hskExamsData as any[]).filter((e) => e.level === 5);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold mb-3 sm:mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-red-600" />
            <span>Eloise 맞춤형 HSK 4급 & 5급 올인원 실전 모의고사 & 단어장</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-2 sm:mb-3">
            Eloise&apos;s HSK APP 🎓
          </h2>
          <p className="text-xs sm:text-base text-slate-600 leading-relaxed mb-4 sm:mb-6">
            공식 기출 5세트 (4급 4세트 + 5급 1세트 · 470문항) + <strong>필수 1000단어장</strong>
            <br className="hidden sm:inline" />
            <strong>한국인을 위한 문항별 심층 한국어 해설</strong> · HSK 공식 CBT 및 아이엘츠 분할 모드 지원
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
              <Headphones className="w-3.5 h-3.5 text-red-600" />
              <span>듣기 MP3 내장</span>
            </span>
            <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
              <Languages className="w-3.5 h-3.5 text-blue-600" />
              <span>한국어 상세 풀이</span>
            </span>
            <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
              <Bot className="w-3.5 h-3.5 text-purple-600" />
              <span>AI 1:1 과외 튜터</span>
            </span>
            <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>180점 합격선 분석</span>
            </span>
          </div>
        </div>

        {/* Feature Banner: Vocabulary Memorization Feature (NEW) */}
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-red-500/15 border-2 border-amber-300 rounded-3xl p-5 sm:p-7 shadow-xs mb-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white uppercase tracking-wider">
                  NEW 기능 추가
                </span>
                <span className="text-xs font-bold text-amber-800">
                  마스터 현황: {masteredWordCount} / 1000단어
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                HSK 4급 & 5급 핵심 필수 1000단어장 (플래시카드 암기)
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                플래시카드 뒤집기 · 원어민 TTS 발음 · 4지선다 퀴즈 · AI에게 예문 및 시험 함정 질문하기
              </p>
            </div>
          </div>

          <Link
            href="/words"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-red-500/25 transition transform active:scale-95 shrink-0"
          >
            <span>지금 단어 외우러 가기</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* HSK 4 Section */}
        <section className="mb-10 sm:mb-12">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-xs font-black">
                  LEVEL 4
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  {locale === "zh" ? "HSK 4级 官方真题精练专区" : "HSK 4급 실전 기출 전용관"}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                총 4세트 (370문항) · 듣기 원음 + 그림 작문 수록 · 4급 핵심 필수 어휘 및 문법 해설
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {hsk4Exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-red-400 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                      {exam.tagKo || exam.tag}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{exam.durationMinutes}분</span>
                      </span>
                      <span>·</span>
                      <span>{exam.questionCount}문항</span>
                    </div>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-red-600 transition mb-1">
                    {locale === "zh" ? exam.title : exam.titleKo || exam.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-3.5">
                    {locale === "zh" ? exam.subTitle : exam.subTitleKo || exam.subTitle}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                  <Link
                    href={`/exam/${exam.id}`}
                    className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>실전 모의고사</span>
                  </Link>
                  <Link
                    href={`/review/${exam.id}`}
                    className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>문제 & 해설 보기</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* HSK 5 Section */}
        <section className="mb-10 sm:mb-12">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-xs font-black">
                  LEVEL 5
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  {locale === "zh" ? "HSK 5级 高分挑战专区" : "HSK 5급 고득점 도약관"}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                중고급 도약 실전 모의고사 (100문항) · 장문 독해 및 작문 한국어 해설 지원
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {hsk5Exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white rounded-2xl border border-blue-200 p-4 sm:p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {exam.tagKo || exam.tag}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{exam.durationMinutes}분</span>
                      </span>
                      <span>·</span>
                      <span>{exam.questionCount}문항</span>
                    </div>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition mb-1">
                    {locale === "zh" ? exam.title : exam.titleKo || exam.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-3.5">
                    {locale === "zh" ? exam.subTitle : exam.subTitleKo || exam.subTitle}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                  <Link
                    href={`/exam/${exam.id}`}
                    className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>실전 모의고사</span>
                  </Link>
                  <Link
                    href={`/review/${exam.id}`}
                    className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>문제 & 해설 보기</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Exam History */}
        {recents.length > 0 && (
          <section className="mb-10">
            <h3 className="text-xs sm:text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>최근 응시 및 학습 기록 ({recents.length}개)</span>
            </h3>

            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
              {recents.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                        {item.titleKo || item.title}
                      </span>
                      {item.status === "submitted" && item.score !== undefined && (
                        <span
                          className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full ${
                            item.score >= 180
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.score}점 {item.score >= 180 ? "(합격)" : "(불합격)"}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                      {new Date(item.updatedAt).toLocaleString()} · {item.questionCount}문항
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === "submitted" ? (
                      <Link
                        href={`/result/${item.id}`}
                        className="px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                      >
                        성적표
                      </Link>
                    ) : (
                      <Link
                        href={`/exam/${item.id}`}
                        className="px-2.5 sm:px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition"
                      >
                        이어서 풀기
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteRecent(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      title="기록 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
