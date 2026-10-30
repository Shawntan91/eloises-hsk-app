"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Exam } from "@/types/exam";
import { Question, OptionKey } from "@/types/question";
import { IeltsHighlight } from "@/types/ielts";
import AudioPlayerBar from "../AudioPlayerBar";
import { formatSeconds, getRemainingSeconds, isUnlimitedDuration } from "@/utils/timer";
import { loadPassageHighlights, savePassageHighlights } from "@/utils/storage";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  Headphones,
  BookOpen,
  LayoutGrid,
  Sparkles,
  Clock,
  Highlighter,
  StickyNote,
  Trash2,
  X,
  RotateCcw,
  Volume2,
} from "lucide-react";

interface IeltsExamLayoutProps {
  exam: Exam;
  currentIndex: number;
  onSelectQuestionIndex: (index: number) => void;
  onSelectAnswer: (ans: string) => void;
  onToggleMark: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSubmitClick: () => void;
  onToggleHskLayout: () => void;
  locale: "ko" | "zh" | "bilingual";
}

export const IeltsExamLayout: React.FC<IeltsExamLayoutProps> = ({
  exam,
  currentIndex,
  onSelectQuestionIndex,
  onSelectAnswer,
  onToggleMark,
  onPrev,
  onNext,
  onSubmitClick,
  onToggleHskLayout,
  locale,
}) => {
  const currentQ = exam.questions[currentIndex];
  const [leftPercent, setLeftPercent] = useState<number>(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Highlights & Notes state
  const passageId = currentQ?.passageId || `exam_${exam.id}_q_${currentQ?.number || 0}`;
  const [highlights, setHighlights] = useState<IeltsHighlight[]>([]);

  useEffect(() => {
    setHighlights(loadPassageHighlights(passageId));
  }, [passageId]);

  const handleAddHighlight = (color: "yellow" | "blue", text: string) => {
    const newHl: IeltsHighlight = {
      id: `hl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      passageId,
      text,
      color,
      createdAt: Date.now(),
    };
    const nextList = [...highlights, newHl];
    setHighlights(nextList);
    savePassageHighlights(passageId, nextList);
  };

  const handleRemoveHighlight = (id: string) => {
    const nextList = highlights.filter((h) => h.id !== id);
    setHighlights(nextList);
    savePassageHighlights(passageId, nextList);
  };

  const handleUpdateNote = (id: string, note: string) => {
    const nextList = highlights.map((h) => (h.id === id ? { ...h, note } : h));
    setHighlights(nextList);
    savePassageHighlights(passageId, nextList);
  };

  // Text selection popover
  const [selectionPopover, setSelectionPopover] = useState<{
    visible: boolean;
    x: number;
    y: number;
    text: string;
  }>({ visible: false, x: 0, y: 0, text: "" });

  const [activeNoteModal, setActiveNoteModal] = useState<{
    highlightId: string;
    text: string;
    note: string;
  } | null>(null);
  const [noteInput, setNoteInput] = useState("");

  const handleTextMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const text = selection.toString().trim();
    if (text.length < 2) {
      setSelectionPopover((p) => ({ ...p, visible: false }));
      return;
    }
    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionPopover({
        visible: true,
        x: Math.max(10, rect.left + rect.width / 2 - 90),
        y: Math.max(10, rect.top - 46),
        text,
      });
    } catch {}
  }, []);

  const answeredCount = Object.keys(exam.answers).length;
  const isMarked = currentQ ? exam.markedQuestions.includes(currentQ.id) : false;
  const selectedAnswer = currentQ ? exam.answers[currentQ.id] || "" : "";

  const optionKeys: OptionKey[] = ["A", "B", "C", "D", "E", "F"].filter(
    (k) => currentQ?.options && (currentQ.options as any)[k] !== undefined
  ) as OptionKey[];

  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    if (isUnlimitedDuration(exam.duration)) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [exam.duration]);
  const remaining = getRemainingSeconds(exam.startTime || nowTick, exam.duration);

  // Splitter dragging
  useEffect(() => {
    const handleMove = (clientX: number) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      setLeftPercent(Math.max(25, Math.min(75, pct)));
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Render text with interactive highlights and cloze blanks
  const renderHighlightedText = (text: string) => {
    if (!text) return null;

    // Check for cloze blanks (e.g. （46）______, [46]______, 46.______)
    const blankRegex = /(?:\[\s*(\d{1,2})\s*\]|【\s*(\d{1,2})\s*】|（\s*(\d{1,2})\s*）|\(\s*(\d{1,2})\s*\))/g;

    let processed = text;
    // Replace with interactive button tokens if passage has cloze blanks
    const parts = text.split(blankRegex);
    if (parts.length > 1) {
      return (
        <span>
          {parts.map((segment, idx) => {
            const blankNum = parseInt(segment, 10);
            if (!isNaN(blankNum) && blankNum >= 1 && blankNum <= 100) {
              const targetQ = exam.questions.find((q) => q.number === blankNum);
              const targetAnswer = targetQ ? exam.answers[targetQ.id] : "";
              const answeredText = targetAnswer && targetQ?.options
                ? (targetQ.options as any)[targetAnswer] || targetAnswer
                : null;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const targetIdx = exam.questions.findIndex((q) => q.number === blankNum);
                    if (targetIdx >= 0) onSelectQuestionIndex(targetIdx);
                  }}
                  className={`inline-flex items-center gap-1 mx-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    currentQ?.number === blankNum
                      ? "bg-amber-400 text-slate-950 border-amber-500 ring-2 ring-amber-300"
                      : answeredText
                      ? "bg-blue-600/30 text-blue-300 border-blue-500"
                      : "bg-slate-800 text-slate-300 border-slate-600 hover:border-blue-400"
                  }`}
                  title={`点击定位到第 ${blankNum} 题`}
                >
                  <span className="font-mono">({blankNum})</span>
                  <span>{answeredText ? `[ ${answeredText} ]` : "______"}</span>
                </button>
              );
            }
            return <span key={idx}>{renderHighlightsOnly(segment)}</span>;
          })}
        </span>
      );
    }

    return renderHighlightsOnly(text);
  };

  const renderHighlightsOnly = (raw: string) => {
    if (!raw || highlights.length === 0) return raw;
    const sorted = [...highlights].sort((a, b) => b.text.length - a.text.length);
    const regex = new RegExp(`(${sorted.map((h) => h.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
    const chunks = raw.split(regex);

    return chunks.map((chunk, i) => {
      const match = sorted.find((h) => h.text === chunk);
      if (!match) return chunk;
      const isYellow = match.color === "yellow";
      return (
        <mark
          key={i}
          onClick={() => {
            setActiveNoteModal({
              highlightId: match.id,
              text: match.text,
              note: match.note || "",
            });
            setNoteInput(match.note || "");
          }}
          className={`cursor-pointer rounded px-1 py-0.5 mx-0.5 transition ${
            isYellow
              ? "bg-amber-400/90 text-slate-950 font-medium"
              : "bg-sky-400/90 text-slate-950 font-medium"
          }`}
          title={match.note ? `메모: ${match.note}` : "클릭하여 메모 추가/삭제"}
        >
          {chunk}
          {match.note && <span className="ml-1 text-[10px]">📝</span>}
        </mark>
      );
    });
  };

  // Writing order_words helpers
  const wordsPool = currentQ?.wordsToOrder || [];
  const punctuation = currentQ?.standardSentence?.slice(-1) || "。";
  const rawAnswerTokens = selectedAnswer
    ? selectedAnswer.replace(/[。？！,.!?]/g, "").split(" ").filter(Boolean)
    : [];

  const handleToggleWord = (word: string, isFromAssembled: boolean) => {
    let nextAssembled: string[];
    if (isFromAssembled) {
      const idx = rawAnswerTokens.indexOf(word);
      if (idx >= 0) {
        nextAssembled = [...rawAnswerTokens.slice(0, idx), ...rawAnswerTokens.slice(idx + 1)];
      } else nextAssembled = rawAnswerTokens;
    } else {
      nextAssembled = [...rawAnswerTokens, word];
    }
    const final = nextAssembled.length > 0 ? nextAssembled.join("") + punctuation : "";
    onSelectAnswer(final);
  };

  const requiredWords = currentQ?.requiredWord ? currentQ.requiredWord.split(/\s+/).filter(Boolean) : [];

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-slate-900 text-slate-100 select-none font-sans">
      {/* 1. Top Header */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5">
            <span>{locale === "zh" ? "HSK 左右分屏阅读模式" : "HSK 좌우 분할 독해 모드"}</span>
          </span>
          <span className="text-sm font-bold truncate max-w-sm hidden sm:inline">
            {locale === "zh" ? exam.title : exam.titleKo || exam.title}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-lg text-amber-400 font-mono text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatSeconds(remaining, locale)}</span>
          </div>

          <button
            type="button"
            onClick={onToggleHskLayout}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 text-xs font-bold rounded-lg transition cursor-pointer"
            title="返回 HSK 官方标准机考界面"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{locale === "zh" ? "切回 HSK 官方机考" : "HSK 공식 CBT 복귀"}</span>
          </button>

          <button
            type="button"
            onClick={onSubmitClick}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{locale === "zh" ? "交卷" : "답안 제출"}</span>
          </button>
        </div>
      </header>

      {/* 2. Audio Bar if audio exists */}
      {exam.audioUrl && (
        <div className="px-4 py-1.5 bg-slate-900 border-b border-slate-800">
          <AudioPlayerBar audioUrl={exam.audioUrl} title={exam.title} />
        </div>
      )}

      {/* 3. Main Split Body */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        {/* Left Pane: Passage, Audio Material & Vocab */}
        <div
          style={{ width: `${leftPercent}%` }}
          className="h-full bg-slate-950 p-6 overflow-y-auto border-r border-slate-800"
          onMouseUp={handleTextMouseUp}
        >
          <div className="max-w-xl mx-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>
                  {locale === "zh" ? "文本与听力材料对照区 (支持划线/笔记)" : "지문 및 어휘 대조 (형광펜/메모 지원)"}
                </span>
              </span>
              <span className="text-[11px] text-slate-400">
                HSK {exam.level}级 · {currentQ?.partCategory}
              </span>
            </div>

            {/* Reading Stem or Transcript */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-200 text-base leading-relaxed whitespace-pre-line font-serif">
              {currentQ?.transcript ? (
                <div>
                  <div className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5" />
                    <span>듣기 녹음 원문 (대화 / 제시문):</span>
                  </div>
                  {renderHighlightedText(currentQ.transcript)}
                  <div className="mt-4 pt-3 border-t border-slate-800 text-slate-300 font-bold">
                    {renderHighlightedText(currentQ.content)}
                  </div>
                </div>
              ) : (
                renderHighlightedText(currentQ?.content || "")
              )}
            </div>

            {/* Image if present */}
            {currentQ?.image && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl inline-block max-w-full">
                <img
                  src={currentQ.image}
                  alt="配图"
                  className="max-h-56 max-w-full rounded object-contain"
                />
              </div>
            )}

            {/* Key Vocab */}
            {currentQ?.vocabList && currentQ.vocabList.length > 0 && (
              <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-4">
                <div className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>핵심 어휘 및 뜻풀이 (HSK Vocabulary):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {currentQ.vocabList.map((v, i) => (
                    <div
                      key={i}
                      className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between"
                    >
                      <span className="font-bold text-slate-200">
                        {v.word} <span className="text-amber-400/80">[{v.pinyin}]</span>
                      </span>
                      <span className="text-slate-400">{v.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Draggable Splitter */}
        <div
          onMouseDown={() => setIsDragging(true)}
          className="w-2 bg-slate-800 hover:bg-blue-600 cursor-col-resize flex items-center justify-center transition-colors flex-shrink-0"
        >
          <div className="w-0.5 h-8 bg-slate-600 rounded-full" />
        </div>

        {/* Right Pane: Options & Answering */}
        <div
          style={{ width: `${100 - leftPercent}%` }}
          className="h-full bg-slate-900 p-6 overflow-y-auto flex flex-col justify-between"
        >
          <div className="max-w-xl mx-auto w-full">
            <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-800/40">
                  第 {currentQ?.number} 题 · {currentQ?.section}
                </span>
                {typeof currentQ?.audioTimestamp === "number" && (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(
                          new CustomEvent("seek-audio-time", { detail: { time: currentQ.audioTimestamp } })
                        );
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 bg-red-600 text-white rounded text-xs font-bold"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>{formatSeconds(currentQ.audioTimestamp)}</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={onToggleMark}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  isMarked
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                    : "border-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                <Flag className={`w-3.5 h-3.5 ${isMarked ? "fill-amber-400 text-amber-400" : ""}`} />
                <span>{isMarked ? "已标记" : "标记"}</span>
              </button>
            </div>

            {/* 1. 连词成句 */}
            {currentQ?.type === "order_words" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 min-h-[90px]">
                  <div className="text-xs font-bold text-slate-400 mb-2 flex items-center justify-between">
                    <span>조립된 문장 (클릭 시 회수):</span>
                    {rawAnswerTokens.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onSelectAnswer("")}
                        className="text-xs text-red-400 hover:underline cursor-pointer"
                      >
                        초기화
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rawAnswerTokens.map((w, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleToggleWord(w, true)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-bold"
                      >
                        {w}
                      </button>
                    ))}
                    {rawAnswerTokens.length > 0 && <span className="text-lg">{punctuation}</span>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {wordsPool.map((w, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleToggleWord(w, false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-blue-400 text-sm font-bold"
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 1. 看图造句 / 写作 */}
            {currentQ?.type === "image_writing" && (
              <div className="space-y-3">
                {requiredWords.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">필수 어휘:</span>
                    {requiredWords.map((w) => (
                      <span
                        key={w}
                        className={`px-2 py-0.5 rounded font-bold ${
                          selectedAnswer.includes(w) ? "bg-emerald-950 text-emerald-400" : "bg-slate-800 text-amber-400"
                        }`}
                      >
                        【{w}】{selectedAnswer.includes(w) ? "✓" : ""}
                      </span>
                    ))}
                  </div>
                )}
                <textarea
                  rows={6}
                  value={selectedAnswer}
                  onChange={(e) => onSelectAnswer(e.target.value)}
                  placeholder="중국어 작문 작성..."
                  className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 outline-none"
                />
              </div>
            )}

            {/* Choice Options */}
            {currentQ?.type !== "order_words" && currentQ?.type !== "image_writing" && (
              <div className="space-y-3">
                {optionKeys.map((k) => {
                  const optText = (currentQ?.options as any)?.[k];
                  const optTextKo = (currentQ?.optionsKo as any)?.[k];
                  const isSelected = selectedAnswer === k;

                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => onSelectAnswer(k)}
                      className={`w-full text-left p-4 rounded-xl border flex items-start gap-4 transition cursor-pointer ${
                        isSelected
                          ? "border-blue-500 bg-blue-600/20 text-white shadow-xs"
                          : "border-slate-800 bg-slate-950/50 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "border border-slate-700 bg-slate-900 text-slate-400"
                        }`}
                      >
                        {k}
                      </div>
                      <div className="flex-1 pt-0.5 text-sm">
                        <div>{optText}</div>
                        {optTextKo && optTextKo !== optText && (
                          <div className="text-xs text-slate-400 mt-0.5">{optTextKo}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-800 max-w-xl mx-auto w-full">
            <button
              type="button"
              onClick={onPrev}
              disabled={currentIndex === 0}
              className={`flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                currentIndex === 0 ? "text-slate-600 cursor-not-allowed" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{locale === "zh" ? "上一题" : "이전 (上一题)"}</span>
            </button>
            <button
              type="button"
              onClick={onNext}
              className="flex items-center gap-1 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer"
            >
              <span>
                {currentIndex === exam.questions.length - 1
                  ? locale === "zh"
                    ? "完成交卷"
                    : "최종 제출 (交卷)"
                  : locale === "zh"
                  ? "下一题"
                  : "다음 (下一题)"}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Highlight Toolbar */}
      {selectionPopover.visible && (
        <div
          style={{ top: `${selectionPopover.y}px`, left: `${selectionPopover.x}px` }}
          className="fixed z-50 bg-slate-950 border border-slate-700 shadow-2xl rounded-xl p-1.5 flex items-center gap-1 text-xs animate-in fade-in zoom-in-95"
        >
          <button
            type="button"
            onClick={() => {
              handleAddHighlight("yellow", selectionPopover.text);
              setSelectionPopover((p) => ({ ...p, visible: false }));
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-400 text-slate-950 font-bold rounded-lg hover:bg-amber-300"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>노란색</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleAddHighlight("blue", selectionPopover.text);
              setSelectionPopover((p) => ({ ...p, visible: false }));
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-sky-400 text-slate-950 font-bold rounded-lg hover:bg-sky-300"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>파란색</span>
          </button>
        </div>
      )}

      {/* Note Modal */}
      {activeNoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full text-xs">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <span className="font-bold text-amber-400">📝 형광펜 메모 관리</span>
              <button
                type="button"
                onClick={() => setActiveNoteModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-slate-300 mb-3 italic">
              &quot;{activeNoteModal.text}&quot;
            </div>
            <textarea
              rows={3}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="이 구문에 대한 메모를 작성하세요..."
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none mb-3"
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  handleRemoveHighlight(activeNoteModal.highlightId);
                  setActiveNoteModal(null);
                }}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>형광펜 지우기</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleUpdateNote(activeNoteModal.highlightId, noteInput);
                  setActiveNoteModal(null);
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Bottom Navigator Strip */}
      <footer className="h-14 bg-slate-950 border-t border-slate-800 px-4 flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {exam.questions.map((q, idx) => {
            const isDone = !!exam.answers[q.id];
            const isCur = idx === currentIndex;
            const isM = exam.markedQuestions.includes(q.id);

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => onSelectQuestionIndex(idx)}
                className={`w-7 h-7 rounded text-xs font-bold flex items-center justify-center flex-shrink-0 transition relative cursor-pointer ${
                  isCur
                    ? "bg-blue-500 text-white ring-2 ring-white"
                    : isDone
                    ? "bg-slate-800 text-blue-400 border border-blue-500/40"
                    : "bg-slate-900 text-slate-500 border border-slate-800 hover:border-slate-700"
                }`}
              >
                <span>{q.number}</span>
                {isM && <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
};

export default IeltsExamLayout;
