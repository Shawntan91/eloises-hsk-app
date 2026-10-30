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
  Sliders,
  FileEdit,
  Upload,
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
  const isKo = locale === "ko";

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-red-50/90 border border-red-200 text-red-700 text-xs font-bold mb-3 sm:mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-red-600" />
            <span>Eloise 맞춤형 HSK 4급 & 5급 올인원 실전 모의고사 & 단어장</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-2 sm:mb-3">
            Eloise&apos;s HSK APP 🎓
          </h2>
          <p className="text-xs sm:text-base text-slate-600 leading-relaxed mb-4 sm:mb-6">
            공식 기출 5세트 (4급 4세트 + 5급 1세트 · 470문항) + <strong>필수 1000단어장</strong>
            <br className="hidden sm:inline" />
            <strong>한국인을 위한 문항별 심층 한국어 해설</strong> · HSK 공식 CBT 및 좌우 분할 독해 지원
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
              <Headphones className="w-3.5 h-3.5 text-red-600" />
              <span>듣기 MP3 내장</span>
            </span>
            <span className="flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
              <Languages className="w-3.5 h-3.5 text-blue-600" />
              <span>한국어 상세 풀이</span>
            </span>
            <span className="flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
              <Bot className="w-3.5 h-3.5 text-purple-600" />
              <span>AI 1:1 과외 튜터</span>
            </span>
            <span className="flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>180점 합격선 분석</span>
            </span>
          </div>
        </div>

        {/* Feature Banner: Vocabulary Memorization Feature */}
        <div className="mb-10 sm:mb-12 bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden group">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 group-hover:skew-x-6 transition-transform" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                  NEW 어휘 특강
                </span>
                <span className="text-xs font-bold text-amber-200">
                  HSK 4급 & 5급 필수 1,000단어
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                Eloise를 위한 스마트 단어장 & 실전 퀴즈
              </h3>
              <p className="text-xs sm:text-sm text-white/90 max-w-xl leading-relaxed">
                플래시카드 암기 · 3가지 퀴즈 모드(듣기/한국어/중국어) · 틀린 단어 오답 자동 별표 저장
              </p>
              <div className="pt-2 flex items-center gap-4 text-xs font-bold">
                <span className="bg-black/20 px-3 py-1 rounded-xl">
                  암기 완료: {masteredWordCount} / 1000 단어
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
              <Link
                href="/words"
                className="px-6 py-3.5 bg-white text-slate-900 hover:bg-amber-50 font-black rounded-2xl text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-red-600" />
                <span>단어장 열기</span>
              </Link>
              <Link
                href="/settings"
                className="px-4 py-3.5 bg-black/20 hover:bg-black/30 text-white font-bold rounded-2xl text-xs sm:text-sm transition border border-white/30 flex items-center justify-center gap-1.5"
              >
                <Sliders className="w-4 h-4" />
                <span>맞춤 시험 설정</span>
              </Link>
            </div>
          </div>
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
                  {locale === "zh" ? "HSK 4级 官方真题模考" : "HSK 4급 실전 기출 모의고사"}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                실제 출제된 정규 기출문제 (듣기 45문항 + 독해 40문항 + 쓰기 15문항)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hsk4Exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-red-400 hover:shadow-md transition-all flex flex-col justify-between group"
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
                      <Link
                        href={`/settings?examId=${exam.id}`}
                        className="ml-1 p-1 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                        title="맞춤형 시험 설정"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-red-600 transition mb-1">
                    {locale === "zh" ? exam.title : exam.titleKo || exam.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-3.5">
                    {locale === "zh" ? exam.subTitle : exam.subTitleKo || exam.subTitle}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100">
                  {/* Primary & Review Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/exam/${exam.id}`}
                      className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isKo ? "정규 실전 모의고사" : "整卷模考 (100题)"}</span>
                    </Link>
                    <Link
                      href={`/review/${exam.id}`}
                      className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>문제 & 해설 보기</span>
                    </Link>
                  </div>

                  {/* Section Practice Shortcuts */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <Link
                      href={`/settings?examId=${exam.id}&part=listening`}
                      className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-red-50 hover:text-red-700 text-slate-600 text-[11px] font-bold text-center border border-slate-200/80 transition flex items-center justify-center gap-1"
                    >
                      <Headphones className="w-3 h-3 text-red-500" />
                      <span>듣기 (1~45)</span>
                    </Link>
                    <Link
                      href={`/settings?examId=${exam.id}&part=reading`}
                      className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-bold text-center border border-slate-200/80 transition flex items-center justify-center gap-1"
                    >
                      <BookOpen className="w-3 h-3 text-blue-500" />
                      <span>독해 (46~85)</span>
                    </Link>
                    <Link
                      href={`/settings?examId=${exam.id}&part=writing`}
                      className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-purple-50 hover:text-purple-700 text-slate-600 text-[11px] font-bold text-center border border-slate-200/80 transition flex items-center justify-center gap-1"
                    >
                      <FileEdit className="w-3 h-3 text-purple-500" />
                      <span>쓰기 (86~100)</span>
                    </Link>
                  </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hsk5Exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-200 p-4 sm:p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between group"
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
                      <Link
                        href={`/settings?examId=${exam.id}`}
                        className="ml-1 p-1 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                        title="맞춤형 시험 설정"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition mb-1">
                    {locale === "zh" ? exam.title : exam.titleKo || exam.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-3.5">
                    {locale === "zh" ? exam.subTitle : exam.subTitleKo || exam.subTitle}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/exam/${exam.id}`}
                      className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isKo ? "정규 실전 모의고사" : "整卷模考 (100题)"}</span>
                    </Link>
                    <Link
                      href={`/review/${exam.id}`}
                      className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>문제 & 해설 보기</span>
                    </Link>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <Link
                      href={`/settings?examId=${exam.id}&part=listening`}
                      className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-bold text-center border border-slate-200/80 transition flex items-center justify-center gap-1"
                    >
                      <Headphones className="w-3 h-3 text-blue-500" />
                      <span>듣기 (1~45)</span>
                    </Link>
                    <Link
                      href={`/settings?examId=${exam.id}&part=reading`}
                      className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-bold text-center border border-slate-200/80 transition flex items-center justify-center gap-1"
                    >
                      <BookOpen className="w-3 h-3 text-blue-500" />
                      <span>독해 (46~85)</span>
                    </Link>
                    <Link
                      href={`/settings?examId=${exam.id}&part=writing`}
                      className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-purple-50 hover:text-purple-700 text-slate-600 text-[11px] font-bold text-center border border-slate-200/80 transition flex items-center justify-center gap-1"
                    >
                      <FileEdit className="w-3 h-3 text-purple-500" />
                      <span>쓰기 (86~100)</span>
                    </Link>
                  </div>
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

            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
              {recents.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        item.status === "submitted"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {item.status === "submitted" ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.status === "submitted"
                          ? `제출 완료 (최종 점수: ${item.score !== undefined ? `${item.score}점` : "채점 완료"})`
                          : "응시 진행 중 · 이어서 풀기 가능"}
                        {" · "}
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={item.status === "submitted" ? `/result/${item.id}` : `/exam/${item.id}`}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        item.status === "submitted"
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                    >
                      <span>{item.status === "submitted" ? "성적표" : "이어풀기"}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDeleteRecent(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="기록 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
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
