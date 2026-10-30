"use client";

import React, { useState, useRef, useEffect } from "react";
import { Download, FileText, Printer, Copy, Check, ChevronDown, Sparkles } from "lucide-react";
import {
  MistakeItem,
  downloadMistakesAsWord,
  downloadMistakesAsMarkdown,
  printMistakes,
  exportMistakesToMarkdown,
} from "@/utils/mistakeBank";

interface ExportMistakesButtonProps {
  items: MistakeItem[];
  title?: string;
  className?: string;
  variant?: "primary" | "secondary" | "subtle";
  locale?: "ko" | "zh" | "bilingual";
}

export const ExportMistakesButton: React.FC<ExportMistakesButtonProps> = ({
  items,
  title = "Eloise_HSK_오답노트",
  className = "",
  variant = "primary",
  locale = "ko",
}) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  if (!items || items.length === 0) {
    return null;
  }

  const handleCopy = async () => {
    try {
      const md = exportMistakesToMarkdown(items, title);
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1500);
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  const btnClasses =
    variant === "primary"
      ? "bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow"
      : variant === "secondary"
      ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
      : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs";

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${btnClasses}`}
        title={`오답노트 ${items.length}문항 일괄 내보내기`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>{locale === "zh" ? `导出错题 (${items.length})` : `오답 내보내기 (${items.length})`}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {locale === "zh" ? "选择导出格式" : "내보내기 형식 선택"}
            </div>
            <div className="text-xs font-semibold text-slate-700 truncate">{title}</div>
          </div>

          {/* Word (.doc) Download */}
          <button
            type="button"
            onClick={() => {
              downloadMistakesAsWord(items, title);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-slate-700 hover:bg-red-50 hover:text-red-700 rounded-xl transition cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-bold">Word 문서 (.doc) 다운로드</div>
              <div className="text-[10px] text-slate-400">맞춤 서식 포함, A4 출력용</div>
            </div>
          </button>

          {/* Markdown (.md) Download */}
          <button
            type="button"
            onClick={() => {
              downloadMistakesAsMarkdown(items, title);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-slate-700 hover:bg-red-50 hover:text-red-700 rounded-xl transition cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-bold">Markdown (.md) 다운로드</div>
              <div className="text-[10px] text-slate-400">Notion / Obsidian 노트 연동</div>
            </div>
          </button>

          {/* Direct Print / PDF */}
          <button
            type="button"
            onClick={() => {
              printMistakes(items, title);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Printer className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-bold">바로 인쇄 / PDF 저장</div>
              <div className="text-[10px] text-slate-400">A4용지 출력 및 PDF 파일 생성</div>
            </div>
          </button>

          {/* Copy to Clipboard */}
          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl transition cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </div>
            <div>
              <div className="font-bold">{copied ? "복사 완료! (클립보드 저장됨)" : "마크다운 전체 복사"}</div>
              <div className="text-[10px] text-slate-400">클립보드에 복사하여 붙여넣기</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportMistakesButton;
