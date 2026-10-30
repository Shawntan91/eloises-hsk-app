"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/common/Header";
import hskWordsData from "@/data/hskWords.json";
import {
  getMasteredWordNos,
  toggleWordMastered,
  getStarredWordNos,
  toggleWordStarred,
  getSavedStudyIndex,
  saveStudyIndex,
} from "@/utils/wordStorage";
import AiTutorModal from "@/components/tutor/AiTutorModal";
import {
  BookOpen,
  Volume2,
  Star,
  CheckCircle2,
  RotateCcw,
  Bot,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Layers,
  HelpCircle,
  Award,
  Headphones,
  Languages,
} from "lucide-react";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const PAGE_SIZE = 40;

export default function WordsPage() {
  const [activeTab, setActiveTab] = useState<"card" | "list" | "quiz">("card");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredNos, setMasteredNos] = useState<number[]>([]);
  const [starredNos, setStarredNos] = useState<number[]>([]);
  const [aiModalWord, setAiModalWord] = useState<any | null>(null);

  // Search and Filter states for List Mode
  const [searchQuery, setSearchQuery] = useState("");
  const [posFilter, setPosFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState<"all" | "hsk4" | "hsk5">("all");
  const [letterFilter, setLetterFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unmastered" | "mastered" | "starred">("all");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Quiz state
  const [quizMode, setQuizMode] = useState<"zh_to_ko" | "ko_to_zh" | "listening">("zh_to_ko");
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState<string | null>(null);
  const [quizHistory, setQuizHistory] = useState<boolean[]>([]);
  const [lastAutoStarred, setLastAutoStarred] = useState<number | null>(null);

  const words = hskWordsData as any[];

  useEffect(() => {
    setMasteredNos(getMasteredWordNos());
    setStarredNos(getStarredWordNos());
    const savedIdx = getSavedStudyIndex();
    if (savedIdx >= 0 && savedIdx < words.length) {
      setCurrentIndex(savedIdx);
    }

    const handleProgressChange = () => {
      setMasteredNos(getMasteredWordNos());
      setStarredNos(getStarredWordNos());
    };
    window.addEventListener("word-progress-changed", handleProgressChange);
    return () => window.removeEventListener("word-progress-changed", handleProgressChange);
  }, [words.length]);

  const currentWord = words[currentIndex] || words[0];

  const handleNextCard = () => {
    setIsFlipped(false);
    const next = (currentIndex + 1) % words.length;
    setCurrentIndex(next);
    saveStudyIndex(next);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    const prev = (currentIndex - 1 + words.length) % words.length;
    setCurrentIndex(prev);
    saveStudyIndex(prev);
  };

  const handleToggleMastered = (no: number) => {
    toggleWordMastered(no);
    setMasteredNos(getMasteredWordNos());
  };

  const handleToggleStarred = (no: number) => {
    toggleWordStarred(no);
    setStarredNos(getStarredWordNos());
  };

  const playSpeech = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "zh-CN";
      utter.rate = 0.9;
      window.speechSynthesis.speak(utter);
    }
  };

  // Filtered words for list view
  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      // Level filter: 1001~1200 is HSK 4, > 1200 is HSK 5
      if (levelFilter === "hsk4" && !(w.no >= 1001 && w.no <= 1200)) return false;
      if (levelFilter === "hsk5" && !(w.no > 1200)) return false;

      // Letter filter
      if (letterFilter !== "all") {
        const cleanPy = (w.pinyin || "").trim().toUpperCase();
        if (!cleanPy.startsWith(letterFilter)) return false;
      }

      // POS
      if (posFilter !== "all" && !w.pos_clean?.includes(posFilter)) {
        return false;
      }

      // Status
      if (statusFilter === "mastered" && !masteredNos.includes(w.no)) return false;
      if (statusFilter === "unmastered" && masteredNos.includes(w.no)) return false;
      if (statusFilter === "starred" && !starredNos.includes(w.no)) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchWord = w.word.toLowerCase().includes(q);
        const matchPy = w.pinyin.toLowerCase().includes(q);
        const matchKo = w.korean.toLowerCase().includes(q);
        if (!matchWord && !matchPy && !matchKo) return false;
      }

      return true;
    });
  }, [words, levelFilter, letterFilter, searchQuery, posFilter, statusFilter, masteredNos, starredNos]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [levelFilter, letterFilter, searchQuery, posFilter, statusFilter]);

  const totalPages = Math.ceil(filteredWords.length / PAGE_SIZE) || 1;
  const paginatedWords = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredWords.slice(start, start + PAGE_SIZE);
  }, [filteredWords, currentPage]);

  // Quiz Pool & Options Generation
  const quizWord = words[quizIndex] || words[0];

  useEffect(() => {
    if (activeTab === "quiz" && quizMode === "listening" && quizWord) {
      playSpeech(quizWord.word);
    }
  }, [activeTab, quizMode, quizIndex, quizWord]);

  const quizOptions = useMemo(() => {
    if (!quizWord) return [];

    if (quizMode === "zh_to_ko" || quizMode === "listening") {
      const correct = quizWord.korean;
      const others = words
        .filter((w) => w.no !== quizWord.no)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map((w) => w.korean);
      return [correct, ...others].sort(() => 0.5 - Math.random());
    } else {
      // ko_to_zh: Pick Chinese words
      const correct = `${quizWord.word} [${quizWord.pinyin}]`;
      const others = words
        .filter((w) => w.no !== quizWord.no)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map((w) => `${w.word} [${w.pinyin}]`);
      return [correct, ...others].sort(() => 0.5 - Math.random());
    }
  }, [quizIndex, quizWord, quizMode, words]);

  const handleSelectQuiz = (opt: string) => {
    if (quizAnswered !== null) return;
    setQuizAnswered(opt);

    let isCorrect = false;
    if (quizMode === "zh_to_ko" || quizMode === "listening") {
      isCorrect = opt === quizWord.korean;
    } else {
      isCorrect = opt.startsWith(quizWord.word);
    }

    if (isCorrect) {
      setQuizScore((s) => s + 1);
    } else {
      // Auto-add wrong word to starred list
      if (!starredNos.includes(quizWord.no)) {
        toggleWordStarred(quizWord.no);
        setStarredNos(getStarredWordNos());
        setLastAutoStarred(quizWord.no);
      }
    }
    setQuizHistory((h) => [...h, isCorrect]);
  };

  const handleNextQuiz = () => {
    setQuizAnswered(null);
    setLastAutoStarred(null);
    // Pick next random question from vocabulary
    const nextRandomIdx = Math.floor(Math.random() * words.length);
    setQuizIndex(nextRandomIdx);
  };

  const masteredCount = masteredNos.length;
  const progressPercent = Math.round((masteredCount / words.length) * 100);

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        {/* Top Header & Stats */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-600 text-white">
                  HSK 4급 & 5급
                </span>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  총 {words.length}단어 완벽 수록
                </span>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  🤖 AI 1:1 과외 연동
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Eloise의 HSK 필수 단어장 📖
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                플래시카드 암기 · 급수/알파벳 필터 · 3가지 퀴즈 모드 · 오답 자동 즐겨찾기 연동
              </p>
            </div>

            {/* Progress Bar */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5 min-w-[220px]">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-600">암기 마스터 진도</span>
                <span className="text-red-600 font-mono">
                  {masteredCount} / {words.length} ({progressPercent}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-red-500 to-amber-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("card")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === "card"
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>플래시카드 암기 (Flashcard)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === "list"
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>단어장 검색 목록 ({filteredWords.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("quiz")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === "quiz"
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Award className="w-4 h-4" />
              <span>실전 단어 퀴즈 (Quiz)</span>
            </button>
          </div>
        </div>

        {/* 1. Flashcard Mode */}
        {activeTab === "card" && currentWord && (
          <div className="flex flex-col items-center">
            {/* Card Counter & Star */}
            <div className="w-full max-w-xl flex items-center justify-between text-xs font-bold text-slate-500 mb-3 px-2">
              <span className="font-mono">
                No. {currentWord.no} / {words.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAiModalWord(currentWord)}
                  className="flex items-center gap-1 text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-lg text-xs font-bold transition"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>AI 질문</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleStarred(currentWord.no)}
                  className={`p-1.5 rounded-lg transition ${
                    starredNos.includes(currentWord.no)
                      ? "text-amber-500 hover:bg-amber-50"
                      : "text-slate-400 hover:bg-slate-100"
                  }`}
                  title="중요 단어 별표"
                >
                  <Star
                    className={`w-4 h-4 ${
                      starredNos.includes(currentWord.no) ? "fill-amber-400" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Flashcard Box */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="w-full max-w-xl min-h-[340px] bg-white/95 backdrop-blur-sm rounded-3xl border-2 border-slate-200 hover:border-red-300 p-8 shadow-md flex flex-col justify-between cursor-pointer transition select-none group"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                  {currentWord.pos_clean || "어휘"}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {isFlipped ? "앞면 보기" : "뒷면 뜻 보기"}
                </span>
              </div>

              {/* Card Center Content */}
              <div className="text-center py-6">
                <h3 className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight mb-3">
                  {currentWord.word}
                </h3>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-xl font-bold font-mono text-red-600">
                    [{currentWord.pinyin}]
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playSpeech(currentWord.word);
                    }}
                    className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                    title="발음 듣기"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Flip Reveal */}
                {isFlipped ? (
                  <div className="mt-6 pt-6 border-t border-slate-100 animate-in fade-in zoom-in-95">
                    <p className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">
                      {currentWord.korean}
                    </p>
                    {currentWord.examples && currentWord.examples.length > 0 && (
                      <div className="mt-4 p-3 rounded-xl bg-slate-50 text-left text-xs space-y-1">
                        <p className="font-bold text-slate-700">예문:</p>
                        <p className="text-slate-600">{currentWord.examples[0].zh}</p>
                        <p className="text-slate-500">{currentWord.examples[0].ko}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-6 flex items-center justify-center gap-1 group-hover:text-red-500 transition">
                    <span>👆 카드를 클릭하여 한국어 뜻 확인</span>
                  </p>
                )}
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between text-xs pt-4 border-t border-slate-100 text-slate-400">
                <span>
                  {masteredNos.includes(currentWord.no) ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>암기 완료됨</span>
                    </span>
                  ) : (
                    <span>학습 중</span>
                  )}
                </span>
                <span className="text-[11px]">Space / 클릭으로 뒤집기</span>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="w-full max-w-xl flex items-center justify-between gap-3 mt-6">
              <button
                type="button"
                onClick={handlePrevCard}
                className="flex items-center gap-1 px-4 py-3 bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl text-xs sm:text-sm font-bold shadow-xs transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>이전 단어</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleMastered(currentWord.no)}
                className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold transition shadow-xs flex items-center justify-center gap-1.5 ${
                  masteredNos.includes(currentWord.no)
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {masteredNos.includes(currentWord.no) ? "마스터 취소" : "외웠어요 (알아요)"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleNextCard}
                className="flex items-center gap-1 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-xs transition"
              >
                <span>다음 단어</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 2. List & Search Mode */}
        {activeTab === "list" && (
          <div className="space-y-4">
            {/* Search Bar & Multi-Filters */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="단어, 병음, 한국어 뜻 검색 (예: 爱情, aiqing, 사랑)"
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-slate-50/70"
                  />
                </div>

                {/* Level Filter */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setLevelFilter("all")}
                    className={`px-3 py-1 rounded-lg transition ${
                      levelFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    전체 급수
                  </button>
                  <button
                    type="button"
                    onClick={() => setLevelFilter("hsk4")}
                    className={`px-3 py-1 rounded-lg transition ${
                      levelFilter === "hsk4" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    HSK 4급 (1001~1200)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLevelFilter("hsk5")}
                    className={`px-3 py-1 rounded-lg transition ${
                      levelFilter === "hsk5" ? "bg-white text-purple-600 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    HSK 5급 (1201~2000)
                  </button>
                </div>

                {/* Status Filter */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={`px-3 py-1 rounded-lg transition ${
                      statusFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    전체
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("unmastered")}
                    className={`px-3 py-1 rounded-lg transition ${
                      statusFilter === "unmastered"
                        ? "bg-white text-red-600 shadow-xs"
                        : "text-slate-500"
                    }`}
                  >
                    미완료
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("mastered")}
                    className={`px-3 py-1 rounded-lg transition ${
                      statusFilter === "mastered"
                        ? "bg-white text-emerald-600 shadow-xs"
                        : "text-slate-500"
                    }`}
                  >
                    마스터
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("starred")}
                    className={`px-3 py-1 rounded-lg transition ${
                      statusFilter === "starred"
                        ? "bg-white text-amber-600 shadow-xs"
                        : "text-slate-500"
                    }`}
                  >
                    ★ 찜한 단어
                  </button>
                </div>
              </div>

              {/* Initial Letter Filter (A~Z) */}
              <div className="flex items-center gap-1 overflow-x-auto text-xs py-1 border-t border-slate-100 pt-2.5">
                <span className="text-slate-400 font-bold shrink-0 mr-1">이니셜:</span>
                <button
                  type="button"
                  onClick={() => setLetterFilter("all")}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold shrink-0 transition ${
                    letterFilter === "all"
                      ? "bg-red-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  ALL
                </button>
                {ALPHABET.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => setLetterFilter(letter)}
                    className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono font-bold shrink-0 transition ${
                      letterFilter === letter
                        ? "bg-red-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>

              {/* POS Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
                <span className="text-slate-400 font-bold shrink-0">품사:</span>
                {[
                  { id: "all", label: "전체" },
                  { id: "动", label: "동사 (动)" },
                  { id: "名", label: "명사 (名)" },
                  { id: "形", label: "형용사 (形)" },
                  { id: "副", label: "부사 (副)" },
                  { id: "量", label: "양사 (量)" },
                  { id: "介", label: "개사 (介)" },
                  { id: "连", label: "접속사 (连)" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPosFilter(item.id)}
                    className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold whitespace-nowrap transition ${
                      posFilter === item.id
                        ? "bg-red-50 text-red-700 border-red-300"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Word List Items Header & Pagination Info */}
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
              <span>
                검색 결과: 총 <strong className="text-slate-800">{filteredWords.length}</strong>개 단어 (
                페이지 {currentPage} / {totalPages})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {paginatedWords.map((w) => {
                const isM = masteredNos.includes(w.no);
                const isS = starredNos.includes(w.no);

                return (
                  <div
                    key={w.no}
                    className={`bg-white/90 backdrop-blur-sm rounded-2xl border p-4 shadow-xs flex items-center justify-between gap-3 transition ${
                      isM ? "border-slate-200 opacity-80" : "border-slate-200 hover:border-red-300"
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-slate-100 font-bold text-xs flex items-center justify-center text-slate-600 shrink-0 font-mono">
                        {w.no}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-slate-900">{w.word}</span>
                          <span className="text-xs font-mono font-bold text-red-600">
                            [{w.pinyin}]
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                            {w.pos_clean}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 truncate mt-0.5 font-medium">
                          {w.korean}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => playSpeech(w.word)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition"
                        title="발음 듣기"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setAiModalWord(w)}
                        className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition"
                        title="AI 질문"
                      >
                        <Bot className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStarred(w.no)}
                        className={`p-1.5 rounded-lg transition ${
                          isS
                            ? "text-amber-500 hover:bg-amber-50"
                            : "text-slate-300 hover:text-slate-500 hover:bg-slate-100"
                        }`}
                        title="별표"
                      >
                        <Star className={`w-4 h-4 ${isS ? "fill-amber-400" : ""}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleMastered(w.no)}
                        className={`p-1.5 rounded-lg transition ${
                          isM
                            ? "text-emerald-600 hover:bg-emerald-50"
                            : "text-slate-300 hover:text-slate-500 hover:bg-slate-100"
                        }`}
                        title="마스터"
                      >
                        <CheckCircle2 className={`w-4 h-4 ${isM ? "fill-emerald-100" : ""}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6 pb-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white/90 disabled:opacity-40 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>이전 페이지</span>
                </button>

                <div className="flex items-center gap-1 text-xs font-bold">
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 7) {
                      if (currentPage > 4 && currentPage < totalPages - 2) {
                        pageNum = currentPage - 3 + i;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 6 + i;
                      }
                    }
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-xl font-mono text-xs transition ${
                          currentPage === pageNum
                            ? "bg-red-600 text-white font-bold shadow-xs"
                            : "bg-white/80 border border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white/90 disabled:opacity-40 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1"
                >
                  <span>다음 페이지</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. Quiz Mode */}
        {activeTab === "quiz" && quizWord && (
          <div className="flex flex-col items-center">
            <div className="w-full max-w-xl bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              {/* Quiz Header with 3 Modes */}
              <div className="pb-4 mb-6 border-b border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                    <span>실전 어휘 퀴즈</span>
                  </span>
                  <span className="font-mono text-emerald-600 font-bold">
                    정답: {quizScore} / {quizHistory.length} (
                    {quizHistory.length > 0
                      ? Math.round((quizScore / quizHistory.length) * 100)
                      : 0}
                    %)
                  </span>
                </div>

                {/* 3 Mode Switcher */}
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setQuizMode("zh_to_ko");
                      setQuizAnswered(null);
                    }}
                    className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                      quizMode === "zh_to_ko"
                        ? "bg-white text-red-600 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Languages className="w-3.5 h-3.5" />
                    <span>看中选韩</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuizMode("ko_to_zh");
                      setQuizAnswered(null);
                    }}
                    className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                      quizMode === "ko_to_zh"
                        ? "bg-white text-blue-600 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>看韩选中</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuizMode("listening");
                      setQuizAnswered(null);
                    }}
                    className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                      quizMode === "listening"
                        ? "bg-white text-purple-600 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>听音选义</span>
                  </button>
                </div>
              </div>

              {/* Quiz Prompt */}
              <div className="text-center mb-8">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {quizMode === "zh_to_ko" && "다음 중국어 단어의 올바른 한국어 뜻은?"}
                  {quizMode === "ko_to_zh" && "다음 한국어 뜻에 일치하는 올바른 중국어 단어는?"}
                  {quizMode === "listening" && "발음을 듣고 올바른 한국어 뜻을 선택하세요"}
                </div>

                {quizMode === "zh_to_ko" && (
                  <>
                    <h3 className="text-4xl sm:text-5xl font-black text-slate-900 mb-2">
                      {quizWord.word}
                    </h3>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg font-bold font-mono text-red-600">
                        [{quizWord.pinyin}]
                      </span>
                      <button
                        type="button"
                        onClick={() => playSpeech(quizWord.word)}
                        className="p-1 rounded-full text-slate-400 hover:text-red-600"
                        title="발음 듣기"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}

                {quizMode === "ko_to_zh" && (
                  <h3 className="text-3xl sm:text-4xl font-black text-blue-700 my-4">
                    {quizWord.korean}
                  </h3>
                )}

                {quizMode === "listening" && (
                  <div className="my-4">
                    <button
                      type="button"
                      onClick={() => playSpeech(quizWord.word)}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-base transition shadow-xs"
                    >
                      <Volume2 className="w-5 h-5 animate-pulse text-purple-600" />
                      <span>🔊 다시 발음 듣기 (클릭)</span>
                    </button>
                    {quizAnswered !== null && (
                      <p className="mt-3 text-lg font-bold text-slate-800">
                        정답: {quizWord.word} [{quizWord.pinyin}]
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 4 Options */}
              <div className="space-y-3 mb-6">
                {quizOptions.map((opt, idx) => {
                  const isSelected = quizAnswered === opt;
                  let isCorrect = false;
                  if (quizMode === "zh_to_ko" || quizMode === "listening") {
                    isCorrect = opt === quizWord.korean;
                  } else {
                    isCorrect = opt.startsWith(quizWord.word);
                  }

                  let btnStyle = "border-slate-200 bg-slate-50/70 hover:border-red-300 text-slate-800";
                  if (quizAnswered !== null) {
                    if (isCorrect) {
                      btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold";
                    } else if (isSelected && !isCorrect) {
                      btnStyle = "border-rose-500 bg-rose-50 text-rose-900 font-bold";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectQuiz(opt)}
                      disabled={quizAnswered !== null}
                      className={`w-full text-left p-4 rounded-2xl border text-sm transition flex items-center justify-between cursor-pointer ${btnStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full border border-slate-300 bg-white flex items-center justify-center text-xs font-bold text-slate-600">
                          {["A", "B", "C", "D"][idx]}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {quizAnswered !== null && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback & Auto Starred Alert */}
              {quizAnswered !== null && (
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    {lastAutoStarred === quizWord.no && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>틀린 단어가 별표(★) 단어로 자동 추가되었습니다</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAiModalWord(quizWord)}
                      className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 px-3 py-2 rounded-xl border border-purple-200 hover:bg-purple-100 transition"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>AI 질문</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextQuiz}
                      className="flex items-center gap-1 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                    >
                      <span>다음 퀴즈</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* AI Tutor Modal */}
      <AiTutorModal
        isOpen={Boolean(aiModalWord)}
        onClose={() => setAiModalWord(null)}
        word={aiModalWord}
      />
    </div>
  );
}
