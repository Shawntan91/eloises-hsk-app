"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  findWordInDictionary,
  isWordInBank,
  addWordToReview,
  getSavedWordStrings,
  WordSource,
} from "@/utils/customWords";
import { BookPlus, Check, X, BookmarkCheck, Sparkles } from "lucide-react";

interface SelectableTextProps {
  content: string;
  className?: string;
  source?: WordSource;
  locale?: "ko" | "zh" | "bilingual";
}

export default function SelectableText({
  content,
  className = "",
  source,
  locale = "ko",
}: SelectableTextProps) {
  const isZh = locale === "zh";
  const [selectedWord, setSelectedWord] = useState<string>("");
  const [pinyin, setPinyin] = useState<string>("");
  const [korean, setKorean] = useState<string>("");
  const [isAlreadyAdded, setIsAlreadyAdded] = useState<boolean>(false);
  const [justAdded, setJustAdded] = useState<boolean>(false);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [savedWords, setSavedWords] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSavedWords(getSavedWordStrings());
    const handleSavedChange = () => setSavedWords(getSavedWordStrings());
    window.addEventListener("eloise-saved-words-changed", handleSavedChange);
    return () => window.removeEventListener("eloise-saved-words-changed", handleSavedChange);
  }, []);

  const handleSelection = () => {
    if (typeof window === "undefined") return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const raw = selection.toString().trim();
    // Only process Chinese character selections (1 to 8 characters)
    if (!raw || !/^[\u4e00-\u9fa5]{1,8}$/.test(raw)) return;

    // Calculate popover coordinates relative to container
    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectedWord(raw);
      setJustAdded(false);

      // Lookup in dictionary
      const found = findWordInDictionary(raw);
      if (found) {
        setPinyin(found.pinyin || "");
        setKorean(found.korean || "");
      } else {
        setPinyin("");
        setKorean("");
      }

      setIsAlreadyAdded(isWordInBank(raw));

      // Position bubble above selection
      setPopoverPos({
        x: Math.max(10, Math.min(window.innerWidth - 300, rect.left)),
        y: Math.max(10, rect.top + window.scrollY - 10),
      });
    } catch {}
  };

  const handleAdd = () => {
    if (!selectedWord) return;
    const res = addWordToReview(
      {
        word: selectedWord,
        pinyin: pinyin || "",
        korean: korean || (isZh ? "做题生词" : "시험 지문 발췌 단어"),
      },
      source
    );

    setIsAlreadyAdded(true);
    setJustAdded(true);
    setTimeout(() => {
      setPopoverPos(null);
    }, 1500);
  };

  // Render text with dashed underline on saved words
  const renderTextWithHighlights = (rawText: string) => {
    if (savedWords.length === 0) return rawText;

    // Filter saved words that actually appear in rawText
    const present = savedWords.filter((w) => w && rawText.includes(w));
    if (present.length === 0) return rawText;

    // Sort by length descending so longer words match first
    present.sort((a, b) => b.length - a.length);
    const regex = new RegExp(`(${present.join("|")})`, "g");
    const parts = rawText.split(regex);

    return parts.map((part, idx) => {
      if (present.includes(part)) {
        return (
          <span
            key={idx}
            className="border-b-2 border-dashed border-red-500 font-semibold bg-red-50/50 text-red-950 px-0.5 rounded cursor-pointer"
            title={isZh ? "已加入单词本 SM-2 今日复习" : "단어장 SM-2 복습 목록에 추가됨"}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseUp={handleSelection}
      onTouchEnd={handleSelection}
      className={`relative select-text ${className}`}
    >
      <div className="whitespace-pre-line leading-relaxed">
        {renderTextWithHighlights(content)}
      </div>

      {/* Floating Tooltip Bubble */}
      {popoverPos && (
        <div
          style={{
            position: "fixed",
            left: `${popoverPos.x}px`,
            top: `${Math.max(10, popoverPos.y - 120)}px`,
            zIndex: 9999,
          }}
          className="w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 text-xs animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-red-600" />
              <span className="text-sm font-black text-red-600">{selectedWord}</span>
              {isAlreadyAdded && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded-md font-normal">
                  {isZh ? "已在单词本中" : "단어장에 있음"}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPopoverPos(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-mono text-[11px] w-10">拼音:</span>
              <input
                type="text"
                value={pinyin}
                onChange={(e) => setPinyin(e.target.value)}
                placeholder={isZh ? "可输入拼音" : "병음 입력"}
                className="flex-1 px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono text-slate-800"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px] w-10">韩义:</span>
              <input
                type="text"
                value={korean}
                onChange={(e) => setKorean(e.target.value)}
                placeholder={isZh ? "释义 (韩语或中文)" : "한국어 뜻 입력"}
                className="flex-1 px-2 py-1 rounded-lg border border-slate-200 text-xs text-slate-800"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className={`w-full py-1.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              justAdded
                ? "bg-emerald-600 text-white"
                : isAlreadyAdded
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "bg-red-600 hover:bg-red-700 text-white shadow-xs"
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{isZh ? "已加入今日复习！" : "오늘 복습 목록에 추가됨!"}</span>
              </>
            ) : isAlreadyAdded ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isZh ? "已在单词本 (点击更新)" : "이미 있음 (업데이트)"}</span>
              </>
            ) : (
              <>
                <BookPlus className="w-3.5 h-3.5" />
                <span>{isZh ? "加入单词本 (今日立即复习)" : "단어장 추가 (오늘 즉시 복습)"}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
