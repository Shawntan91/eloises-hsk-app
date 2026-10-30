"use client";

import React, { useState, useEffect } from "react";
import { Exam } from "@/types/exam";
import { Question, OptionKey } from "@/types/question";
import { formatSeconds, getRemainingSeconds, getSectionRangeLabel, isUnlimitedDuration } from "@/utils/timer";
import AudioPlayerBar from "./AudioPlayerBar";
import AiTutorModal from "@/components/tutor/AiTutorModal";
import MarkdownText from "@/components/common/MarkdownText";
import ListeningShadowing from "./ListeningShadowing";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  Headphones,
  BookOpen,
  PenTool,
  Columns,
  Languages,
  CheckCircle2,
  Clock,
  Sparkles,
  Bot,
  LayoutGrid,
  X,
  RotateCcw,
  Volume2,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface HskCbtExamLayoutProps {
  exam: Exam;
  currentIndex: number;
  onSelectQuestionIndex: (index: number) => void;
  onSelectAnswer: (ans: string) => void;
  onToggleMark: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSubmitClick: () => void;
  onToggleIeltsLayout: () => void;
  locale: "ko" | "zh" | "bilingual";
}

export const HskCbtExamLayout: React.FC<HskCbtExamLayoutProps> = ({
  exam,
  currentIndex,
  onSelectQuestionIndex,
  onSelectAnswer,
  onToggleMark,
  onPrev,
  onNext,
  onSubmitClick,
  onToggleIeltsLayout,
  locale,
}) => {
  const currentQ = exam.questions[currentIndex];

  // 3. 辅助提示初始状态改为默认关闭 (false)
  const [showKoreanHelp, setShowKoreanHelp] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  // 2. 听力原文默认折叠 (false)
  const [showTranscript, setShowTranscript] = useState(false);
  const [, setTick] = useState(0);

  // Live 1s countdown ticker when timer is not unlimited
  useEffect(() => {
    if (isUnlimitedDuration(exam.duration)) return;
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [exam.duration]);

  // Reset transcript collapse when question changes
  useEffect(() => {
    setShowTranscript(false);
  }, [currentIndex]);

  const answeredCount = Object.keys(exam.answers).length;
  const isMarked = currentQ ? exam.markedQuestions.includes(currentQ.id) : false;
  const selectedAnswer = currentQ ? exam.answers[currentQ.id] || "" : "";

  const optionKeys: OptionKey[] = ["A", "B", "C", "D", "E", "F"].filter(
    (k) => currentQ?.options && (currentQ.options as any)[k] !== undefined
  ) as OptionKey[];

  const remaining = getRemainingSeconds(exam.startTime || Date.now(), exam.duration);
  const categories = ["听力", "阅读", "书写"] as const;

  // Jump audio handler
  const handleJumpAudio = (sec?: number) => {
    if (typeof sec === "number" && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("seek-audio-time", { detail: { time: sec } }));
    }
  };

  // 1. 连词成句交互状态
  const wordsPool = currentQ?.wordsToOrder || [];
  // Parse currently selected word blocks from user's answer or initialize
  const punctuation = currentQ?.standardSentence?.slice(-1) || "。";
  const rawAnswerTokens = selectedAnswer
    ? selectedAnswer
        .replace(/[。？！,.!?]/g, "")
        .split(" ")
        .filter(Boolean)
    : [];

  const handleToggleWord = (word: string, isFromAssembled: boolean) => {
    let nextAssembled: string[];
    if (isFromAssembled) {
      // Remove first occurrence of word from assembled
      const idx = rawAnswerTokens.indexOf(word);
      if (idx >= 0) {
        nextAssembled = [...rawAnswerTokens.slice(0, idx), ...rawAnswerTokens.slice(idx + 1)];
      } else {
        nextAssembled = rawAnswerTokens;
      }
    } else {
      // Add word to assembled
      nextAssembled = [...rawAnswerTokens, word];
    }
    const finalSentence = nextAssembled.length > 0 ? nextAssembled.join("") + punctuation : "";
    onSelectAnswer(finalSentence);
  };

  const handleResetWordOrder = () => {
    onSelectAnswer("");
  };

  // Word pool count calculation
  const getRemainingPool = () => {
    const usedCounts: Record<string, number> = {};
    for (const w of rawAnswerTokens) {
      usedCounts[w] = (usedCounts[w] || 0) + 1;
    }
    const poolWithStatus: Array<{ word: string; isUsed: boolean; key: string }> = [];
    wordsPool.forEach((w, idx) => {
      const isUsed = (usedCounts[w] || 0) > 0;
      if (isUsed) {
        usedCounts[w]--;
      }
      poolWithStatus.push({ word: w, isUsed, key: `${w}_${idx}` });
    });
    return poolWithStatus;
  };

  // Required words detection for image writing
  const requiredWords = currentQ?.requiredWord
    ? currentQ.requiredWord.split(/\s+/).filter(Boolean)
    : [];

  // Keyboard Shortcuts (A/B/C/D to answer, Left/Right arrows to navigate, Space for audio, M for mark)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (showAiModal || showMobilePalette) return;

      const key = e.key;
      const upperKey = key.toUpperCase();

      // Options A-F
      if (["A", "B", "C", "D", "E", "F"].includes(upperKey)) {
        if (currentQ?.options && (currentQ.options as any)[upperKey] !== undefined) {
          e.preventDefault();
          onSelectAnswer(upperKey);
          return;
        }
      }

      // Navigation: Left / Right
      if (key === "ArrowLeft" || key === "PageUp") {
        e.preventDefault();
        onPrev();
        return;
      }
      if (key === "ArrowRight" || key === "PageDown") {
        e.preventDefault();
        onNext();
        return;
      }

      // Mark toggle
      if (key === "m" || key === "M") {
        e.preventDefault();
        onToggleMark();
        return;
      }

      // Space to toggle audio
      if (key === " " && exam.audioUrl) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("toggle-audio-play"));
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentQ,
    onSelectAnswer,
    onPrev,
    onNext,
    onToggleMark,
    showAiModal,
    showMobilePalette,
    exam.audioUrl,
  ]);

  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-h-screen text-slate-900 select-none font-sans pb-16 sm:pb-0">
      {/* 1. Official HSK CBT Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Test title & Candidate badge */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-red-600 font-extrabold flex items-center justify-center text-xs sm:text-sm shadow-md shadow-red-600/30 shrink-0">
              HSK{exam.level}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-xs sm:text-base font-bold truncate text-slate-100">
                  {locale === "zh" ? exam.title : exam.titleKo || exam.title}
                </h2>
                <span
                  className={`hidden md:inline-block px-2 py-0.2 rounded-full text-[10px] border font-medium ${
                    exam.answerMode === "practice"
                      ? "bg-emerald-950 text-emerald-300 border-emerald-800/60"
                      : "bg-red-950 text-red-300 border-red-800/60"
                  }`}
                >
                  {exam.answerMode === "practice"
                    ? locale === "zh"
                      ? "即时反馈练习模式"
                      : "실시간 해설 연습 모드"
                    : locale === "zh"
                    ? "官方机考网考界面"
                    : "공식 CBT 모의고사"}
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1.5 sm:gap-2">
                <span className="text-amber-400 font-semibold truncate max-w-[80px] sm:max-w-none">
                  👤 Eloise
                </span>
                <span>·</span>
                <span>
                  {locale === "zh" ? "已作答" : "답안 완료"}: {answeredCount} / {exam.questions.length}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Timer, Layout Switcher & Submit */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Keyboard Shortcuts Hint */}
            <div
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 rounded-xl border border-slate-700/60 text-slate-400 text-[11px] font-mono"
              title={
                locale === "zh"
                  ? "支持键盘快捷键：[A-D] 作答，[←/→] 翻题，[Space] 听力播放/暂停，[M] 标记"
                  : "단축키 지원: [A-D] 선택, [←/→] 문항 이동, [Space] 음성 재생/일시정지, [M] 마킹"
              }
            >
              <span>⌨️</span>
              <span className="text-slate-300">A-D</span>
              <span>·</span>
              <span className="text-slate-300">←/→</span>
              <span>·</span>
              <span className="text-slate-300">Space</span>
            </div>

            {/* Countdown Timer */}
            <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-slate-800 rounded-xl border border-slate-700 text-amber-400 font-mono font-bold text-xs sm:text-sm">
              <Clock
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 ${
                  isUnlimitedDuration(exam.duration) ? "" : "animate-pulse"
                }`}
              />
              <span>{formatSeconds(remaining, locale)}</span>
            </div>

            {/* Toggle Split screen layout (4. 规范文案) */}
            <button
              type="button"
              onClick={onToggleIeltsLayout}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              title="切换为左右分屏阅读模式 (좌우 분할 독해 모드)"
            >
              <Columns className="w-3.5 h-3.5 text-blue-400" />
              <span>{locale === "zh" ? "左右分屏阅读" : "좌우 분할 독해"}</span>
            </button>

            {/* Submit Button */}
            <button
              type="button"
              onClick={onSubmitClick}
              className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-red-600/30 transition transform active:scale-95 cursor-pointer"
            >
              <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{locale === "zh" ? "交卷" : "답안 제출"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Audio Player Header for Listening section */}
      {exam.audioUrl && (
        <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 pt-2 sm:pt-3">
          <AudioPlayerBar audioUrl={exam.audioUrl} title={exam.title} />
        </div>
      )}

      {/* 3. Main Body: Question Card (8 cols) and Navigator (4 cols) */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 py-3 sm:py-4 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Left: Question Card */}
        <div className="lg:col-span-8 w-full flex flex-col">
          {currentQ ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-8 shadow-xs flex flex-col justify-between min-h-[460px] sm:min-h-[520px]">
              <div>
                {/* Section & Part Badge */}
                <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-5 border-b border-slate-100 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center shrink-0">
                      {currentQ.number}
                    </span>
                    <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5">
                      {currentQ.partCategory === "听力" ? (
                        <Headphones className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      ) : currentQ.partCategory === "阅读" ? (
                        <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : (
                        <PenTool className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      )}
                      <span className="truncate max-w-[150px] sm:max-w-none">
                        {locale === "zh" ? currentQ.section : currentQ.sectionKo || currentQ.section}
                      </span>
                    </span>

                    {/* Audio Jump Button for listening questions */}
                    {typeof currentQ.audioTimestamp === "number" && (
                      <button
                        type="button"
                        onClick={() => handleJumpAudio(currentQ.audioTimestamp)}
                        className="flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition shadow-xs cursor-pointer"
                        title="点击直接跳至本题听力音频处播放"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{formatSeconds(currentQ.audioTimestamp)} 재생</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Ask AI Tutor */}
                    <button
                      type="button"
                      onClick={() => setShowAiModal(true)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition cursor-pointer"
                      title="AI에게 이 문제에 대해 물어보기"
                    >
                      <Bot className="w-3.5 h-3.5 text-purple-600" />
                      <span>AI 튜터</span>
                    </button>

                    {/* Korean Help Toggle (Default off) */}
                    <button
                      type="button"
                      onClick={() => setShowKoreanHelp(!showKoreanHelp)}
                      className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                        showKoreanHelp
                          ? "bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-300"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <Languages className="w-3.5 h-3.5 text-amber-600" />
                      <span className="hidden sm:inline">
                        {showKoreanHelp ? "한국어 도움 ON" : "한국어 도움 OFF"}
                      </span>
                      <span className="sm:hidden">도움</span>
                    </button>

                    {/* Mark Button */}
                    <button
                      type="button"
                      onClick={onToggleMark}
                      className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                        isMarked
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      <Flag
                        className={`w-3.5 h-3.5 ${isMarked ? "fill-amber-500 text-amber-500" : ""}`}
                      />
                      <span className="hidden sm:inline">{isMarked ? "표시됨" : "표시"}</span>
                    </button>
                  </div>
                </div>

                {/* Question Stem Content with Interactive Cloze Blank */}
                <div className="text-base sm:text-xl text-slate-900 leading-relaxed font-normal whitespace-pre-line mb-4 font-sans">
                  {(() => {
                    const content = currentQ.content || "";
                    const blankRegex = /(（\s*）|\(\s*\)|（\s*\d+\s*）|\(\s*\d+\s*\)|\[\s*\d+\s*\]|【\s*\d+\s*】)/g;
                    const parts = content.split(blankRegex);
                    if (parts.length <= 1) {
                      return content;
                    }
                    const selectedWord = currentQ?.options && selectedAnswer
                      ? (currentQ.options as any)[selectedAnswer]
                      : null;

                    return (
                      <span>
                        {parts.map((part, idx) => {
                          if (part.match(blankRegex)) {
                            return (
                              <span
                                key={idx}
                                className={`inline-flex items-center mx-1 px-3 py-0.5 rounded-lg text-sm sm:text-base font-bold border transition duration-200 cursor-pointer ${
                                  selectedWord
                                    ? "bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-500/20 shadow-xs"
                                    : "bg-amber-50 text-amber-800 border-dashed border-amber-300"
                                }`}
                                title="클릭하여 아래 보기에서 알맞은 어휘를 선택하세요"
                              >
                                {selectedWord ? `（ ${selectedWord} ）` : `（ ${currentQ.number}번 빈칸 ）`}
                              </span>
                            );
                          }
                          return <span key={idx}>{part}</span>;
                        })}
                      </span>
                    );
                  })()}
                </div>

                {/* 2. 听力题原文折叠开关 (默认隐藏) */}
                {currentQ.transcript && (
                  <div className="my-3 sm:my-4 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/70">
                    <button
                      type="button"
                      onClick={() => setShowTranscript(!showTranscript)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-red-600" />
                        <span>
                          {showTranscript
                            ? "📄 듣기 대본(녹음 원문) 접기"
                            : "📄 듣기 대본(녹음 원문) 펼쳐보기 (기본 접힘)"}
                        </span>
                      </span>
                      {showTranscript ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {showTranscript && (
                      <div className="px-4 py-3 bg-white border-t border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed font-sans animate-in fade-in duration-150">
                        <div className="whitespace-pre-line mb-3">
                          {currentQ.transcript}
                        </div>
                        <ListeningShadowing transcript={currentQ.transcript} />
                      </div>
                    )}
                  </div>
                )}

                {/* Korean Help & Vocabulary Box */}
                {showKoreanHelp && currentQ.vocabList && currentQ.vocabList.length > 0 && (
                  <div className="my-3 sm:my-4 bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 sm:p-3.5 text-xs text-amber-950">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>💡 Eloise를 위한 핵심 어휘 및 병음:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                      {currentQ.vocabList.map((v, i) => (
                        <div
                          key={i}
                          className="bg-white/80 p-1.5 rounded-lg border border-amber-200/60 flex items-center justify-between text-[11px] sm:text-xs"
                        >
                          <span className="font-bold text-slate-800">
                            {v.word} <span className="font-mono text-amber-700 font-normal">[{v.pinyin}]</span>
                          </span>
                          <span className="text-slate-600 truncate ml-2">{v.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question Image if present */}
                {currentQ.image && (
                  <div className="my-3 sm:my-4 p-2 bg-slate-50 border border-slate-200 rounded-xl inline-block max-w-full">
                    <img
                      src={currentQ.image}
                      alt={`第 ${currentQ.number} 题插图`}
                      className="max-h-48 sm:max-h-60 max-w-full rounded object-contain"
                    />
                  </div>
                )}

                {/* 1. 连词成句交互输入 (order_words) */}
                {currentQ.type === "order_words" && (
                  <div className="mt-4 sm:mt-5 space-y-4">
                    {/* Assembled Sentence Box */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border-2 border-dashed border-red-300 min-h-[90px] flex flex-col justify-between">
                      <div className="text-xs font-bold text-slate-400 mb-2 flex items-center justify-between">
                        <span>✨ 조립된 완성 문장 (클릭 시 단어 회수):</span>
                        {rawAnswerTokens.length > 0 && (
                          <button
                            type="button"
                            onClick={handleResetWordOrder}
                            className="text-red-600 hover:text-red-700 text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>전체 비우기</span>
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {rawAnswerTokens.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">
                            아래의 단어 조각을 올바른 어순대로 클릭하여 문장을 만들어주세요.
                          </span>
                        ) : (
                          <>
                            {rawAnswerTokens.map((w, idx) => (
                              <button
                                key={`${w}_${idx}`}
                                type="button"
                                onClick={() => handleToggleWord(w, true)}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-sm sm:text-base font-bold shadow-xs hover:bg-red-700 transition cursor-pointer"
                                title="클릭하여 단어 회수"
                              >
                                {w}
                              </button>
                            ))}
                            <span className="text-lg font-bold text-slate-700">{punctuation}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Word Blocks Pool */}
                    <div>
                      <div className="text-xs font-bold text-slate-600 mb-2">
                        👇 배치할 단어 조각 (클릭하여 문장에 추가):
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {getRemainingPool().map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            disabled={item.isUsed}
                            onClick={() => handleToggleWord(item.word, false)}
                            className={`px-3.5 py-2 rounded-xl text-sm sm:text-base font-bold border transition ${
                              item.isUsed
                                ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed opacity-40"
                                : "bg-white text-slate-800 border-slate-300 hover:border-red-400 hover:bg-red-50/50 shadow-xs cursor-pointer active:scale-95"
                            }`}
                          >
                            {item.word}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 1. 看图造句 / 短文写作 (image_writing) */}
                {currentQ.type === "image_writing" && (
                  <div className="mt-4 sm:mt-5 space-y-3">
                    {/* Required Word Badges */}
                    {requiredWords.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">필수 포함 어휘:</span>
                        {requiredWords.map((word) => {
                          const isIncluded = selectedAnswer.includes(word);
                          return (
                            <span
                              key={word}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 transition ${
                                isIncluded
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                  : "bg-amber-50 text-amber-800 border-amber-300"
                              }`}
                            >
                              <span>【{word}】</span>
                              <span>{isIncluded ? "✅ 포함됨" : "⏳ 미포함"}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Textarea */}
                    <textarea
                      rows={5}
                      value={selectedAnswer}
                      onChange={(e) => onSelectAnswer(e.target.value)}
                      placeholder="여기에 중국어 문장을 직접 작성해 주세요. (지정된 어휘를 반드시 포함하여 문법에 맞게 작문합니다)"
                      className="w-full p-4 rounded-2xl border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 text-sm sm:text-base font-sans text-slate-900 leading-relaxed outline-none transition"
                    />

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>작성 글자 수: {selectedAnswer.length}자</span>
                      <span>HSK 4급은 한 문장, 5급은 80자 내외 작문 권장</span>
                    </div>
                  </div>
                )}

                {/* Choice Option Buttons */}
                {currentQ.type !== "order_words" && currentQ.type !== "image_writing" && (
                  <div className="space-y-2.5 sm:space-y-3 pt-2 sm:pt-3">
                    {optionKeys.map((key) => {
                      const optText = (currentQ.options as any)[key];
                      const optTextKo = (currentQ.optionsKo as any)?.[key];
                      const isSelected = selectedAnswer === key;

                      // Practice mode visual feedback
                      const isPractice = exam.answerMode === "practice" && Boolean(selectedAnswer);
                      const isCorrectAnswer = key === currentQ.officialAnswer;

                      let buttonStyle = isSelected
                        ? "border-red-600 bg-red-50/70 text-red-950 shadow-xs"
                        : "border-slate-200 hover:border-red-300 hover:bg-slate-50/80 text-slate-800";

                      if (isPractice) {
                        if (isCorrectAnswer) {
                          buttonStyle = "border-emerald-500 bg-emerald-50/90 text-emerald-950 font-bold shadow-xs";
                        } else if (isSelected && !isCorrectAnswer) {
                          buttonStyle = "border-rose-500 bg-rose-50/90 text-rose-950 font-bold shadow-xs";
                        } else {
                          buttonStyle = "border-slate-200 opacity-50 text-slate-400";
                        }
                      }

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => onSelectAnswer(key)}
                          className={`w-full text-left p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border flex items-start gap-3 sm:gap-4 transition group cursor-pointer ${buttonStyle}`}
                        >
                          <div
                            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 transition ${
                              isPractice
                                ? isCorrectAnswer
                                  ? "bg-emerald-600 text-white"
                                  : isSelected
                                  ? "bg-rose-600 text-white"
                                  : "bg-slate-100 text-slate-400"
                                : isSelected
                                ? "bg-red-600 text-white shadow-xs"
                                : "bg-white border border-slate-300 text-slate-600 group-hover:border-red-400 group-hover:text-red-600"
                            }`}
                          >
                            {key}
                          </div>
                          <div className="flex-1 pt-0.5 text-sm sm:text-base leading-relaxed min-w-0">
                            <div>{optText}</div>
                            {showKoreanHelp && optTextKo && optTextKo !== optText && (
                              <div className="text-xs text-slate-500 mt-0.5 font-sans">
                                {optTextKo}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 5. 练习模式即时反馈与解析 (Practice Mode Instant Feedback) */}
                {exam.answerMode === "practice" && selectedAnswer && (
                  <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-300 text-slate-800 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                      <span className="font-bold text-xs sm:text-sm text-amber-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>학습 연습 모드 즉시 해설 / 即时解析反馈</span>
                      </span>
                      <span className="text-xs font-mono font-bold">
                        {currentQ.type === "order_words" ? (
                          selectedAnswer.replace(/[。？！,.!?\s]/g, "") ===
                          (currentQ.standardSentence || "").replace(/[。？！,.!?\s]/g, "") ? (
                            <span className="text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-md">
                              ✅ 순서 일치 (Correct)
                            </span>
                          ) : (
                            <span className="text-rose-700 font-bold bg-rose-100 px-2.5 py-0.5 rounded-md">
                              ❌ 순서 확인 필요
                            </span>
                          )
                        ) : selectedAnswer === currentQ.officialAnswer ? (
                          <span className="text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-md">
                            ✅ 정답입니다! (Correct)
                          </span>
                        ) : (
                          <span className="text-rose-700 font-bold bg-rose-100 px-2.5 py-0.5 rounded-md">
                            ❌ 오답 (정답: {currentQ.officialAnswer})
                          </span>
                        )}
                      </span>
                    </div>
                    <MarkdownText content={currentQ.explanationKo || currentQ.explanation} />
                  </div>
                )}
              </div>

              {/* Prev / Next navigation */}
              <div className="flex items-center justify-between pt-5 sm:pt-6 mt-5 sm:mt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onPrev}
                  disabled={currentIndex === 0}
                  className={`flex items-center gap-1 sm:gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                    currentIndex === 0
                      ? "text-slate-300 cursor-not-allowed"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{locale === "zh" ? "上一题" : "이전"}</span>
                </button>

                <button
                  type="button"
                  onClick={onNext}
                  className="flex items-center gap-1 sm:gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/20 transition transform active:scale-95 cursor-pointer"
                >
                  <span>
                    {currentIndex === exam.questions.length - 1
                      ? locale === "zh"
                        ? "准备交卷"
                        : "답안 제출"
                      : locale === "zh"
                      ? "下一题"
                      : "다음"}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-white rounded-2xl border text-center text-slate-400">
              未找到题目
            </div>
          )}
        </div>

        {/* Right: Section Question Palette (Desktop) */}
        <div className="hidden lg:block lg:col-span-4 w-full">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs sticky top-20">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <span>📋 {locale === "zh" ? "答题卡题号导航" : "답안지 문항 이동"}</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {answeredCount} / {exam.questions.length}
              </span>
            </div>

            {/* Sections Accordion */}
            <div className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {categories.map((cat) => {
                const catQuestions = exam.questions.filter((q) => q.partCategory === cat);
                if (catQuestions.length === 0) return null;

                const sectionLabel = getSectionRangeLabel(exam.questions, cat, locale);

                return (
                  <div key={cat} className="space-y-2">
                    <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                        <span>{sectionLabel}</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {catQuestions.filter((q) => exam.answers[q.id]).length} /{" "}
                        {catQuestions.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5">
                      {catQuestions.map((q) => {
                        const qIdx = exam.questions.findIndex((item) => item.id === q.id);
                        const isCurrent = qIdx === currentIndex;
                        const isDone = !!exam.answers[q.id];
                        const isQMarked = exam.markedQuestions.includes(q.id);

                        let btnClass = "border-slate-200 text-slate-700 hover:border-slate-300 bg-white";
                        if (isDone) {
                          btnClass = "border-red-500 bg-red-600 text-white font-bold shadow-xs";
                        }
                        if (isCurrent) {
                          btnClass =
                            "border-2 border-slate-900 ring-2 ring-red-400 font-black text-slate-900 bg-amber-50";
                        }

                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => onSelectQuestionIndex(qIdx)}
                            className={`h-8 rounded-lg border text-xs flex items-center justify-center relative transition cursor-pointer ${btnClass}`}
                            title={`第 ${q.number} 题 (${q.section})`}
                          >
                            <span>{q.number}</span>
                            {isQMarked && (
                              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 ring-1 ring-white" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Fixed Bar: Quick Navigator Button */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-lg">
        <button
          type="button"
          onClick={() => setShowMobilePalette(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold"
        >
          <LayoutGrid className="w-4 h-4 text-red-600" />
          <span>
            {locale === "zh" ? "答题卡" : "답안표"} ({answeredCount}/{exam.questions.length})
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="p-2 bg-slate-100 rounded-xl text-slate-700 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold font-mono">
            {currentIndex + 1} / {exam.questions.length}
          </span>
          <button
            type="button"
            onClick={onNext}
            className="p-2 bg-red-600 text-white rounded-xl active:scale-95 shadow-xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Question Navigator Drawer */}
      {showMobilePalette && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[80vh] flex flex-col p-5 overflow-hidden animate-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {locale === "zh" ? "全卷题号导航" : "전체 문항 바로가기"} ({answeredCount}/{exam.questions.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowMobilePalette(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {categories.map((cat) => {
                const catQuestions = exam.questions.filter((q) => q.partCategory === cat);
                if (catQuestions.length === 0) return null;

                return (
                  <div key={cat}>
                    <div className="text-xs font-bold text-slate-700 mb-2">
                      {getSectionRangeLabel(exam.questions, cat, locale)}
                    </div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {catQuestions.map((q) => {
                        const qIdx = exam.questions.findIndex((item) => item.id === q.id);
                        const isCur = qIdx === currentIndex;
                        const isDone = !!exam.answers[q.id];

                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => {
                              onSelectQuestionIndex(qIdx);
                              setShowMobilePalette(false);
                            }}
                            className={`h-9 rounded-xl border text-xs font-bold flex items-center justify-center transition ${
                              isCur
                                ? "bg-slate-900 text-white border-slate-900"
                                : isDone
                                ? "bg-red-600 text-white border-red-600"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            {q.number}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* AI Tutor Modal */}
      <AiTutorModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        question={currentQ}
      />
    </div>
  );
};

export default HskCbtExamLayout;
