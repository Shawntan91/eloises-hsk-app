"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Globe2, Award, BookmarkCheck, Sparkles, Layers, Menu, X } from "lucide-react";
import { getLocale, setLocale, Locale, I18N } from "@/utils/i18n";
import { getMistakeStats } from "@/utils/mistakeBank";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, rightElement }) => {
  const [locale, setLocaleState] = useState<Locale>("ko");
  const [unmasteredCount, setUnmasteredCount] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setLocaleState(getLocale());

    const updateStats = () => {
      setUnmasteredCount(getMistakeStats().unmastered);
    };
    updateStats();

    const handleLocaleChange = (e: any) => {
      setLocaleState(e.detail || getLocale());
    };

    window.addEventListener("hsk-locale-changed" as any, handleLocaleChange);
    window.addEventListener("mistake-bank-changed", updateStats);
    return () => {
      window.removeEventListener("hsk-locale-changed" as any, handleLocaleChange);
      window.removeEventListener("mistake-bank-changed", updateStats);
    };
  }, []);

  const handleToggleLocale = (target: Locale) => {
    setLocale(target);
    setLocaleState(target);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center space-x-2.5 sm:space-x-3 group min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform shrink-0">
            <span className="font-extrabold text-xs sm:text-sm tracking-tighter">HSK</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight group-hover:text-red-600 transition truncate">
                {title || "Eloise's HSK APP"}
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                Eloise 专享
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate max-w-[200px] sm:max-w-md">
              {subtitle || (locale === "zh" ? "HSK 4级 & 5级 官方真题机考与背单词" : "HSK 4급 & 5급 실전 모의고사 · 단어장 · AI 과외")}
            </p>
          </div>
        </Link>

        {/* Right Tools - Desktop */}
        <div className="hidden md:flex items-center gap-3">
          {/* Words Memorization Link */}
          <Link
            href="/words"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold transition shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{locale === "zh" ? "词汇背诵 (1000词)" : "단어장 (1000단어)"}</span>
          </Link>

          {/* Language Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => handleToggleLocale("ko")}
              className={`px-2 py-1 rounded-lg font-bold transition ${
                locale === "ko"
                  ? "bg-white text-red-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              🇰🇷 한국어
            </button>
            <button
              type="button"
              onClick={() => handleToggleLocale("bilingual")}
              className={`px-2 py-1 rounded-lg font-bold transition ${
                locale === "bilingual"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              🌐 双语
            </button>
            <button
              type="button"
              onClick={() => handleToggleLocale("zh")}
              className={`px-2 py-1 rounded-lg font-bold transition ${
                locale === "zh"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              🇨🇳 中文
            </button>
          </div>

          {/* Mistake Bank Button */}
          <Link
            href="/mistakes"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition shadow-xs"
          >
            <BookmarkCheck className="w-3.5 h-3.5 text-rose-600" />
            <span>{locale === "zh" ? "错题本" : "오답노트"}</span>
            {unmasteredCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-mono leading-none">
                {unmasteredCount}
              </span>
            )}
          </Link>

          {rightElement}
        </div>

        {/* Mobile Action Buttons */}
        <div className="flex md:hidden items-center gap-1.5">
          <Link
            href="/words"
            className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1"
            title="단어장"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[11px]">단어장</span>
          </Link>

          <Link
            href="/mistakes"
            className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold relative"
            title="오답노트"
          >
            <BookmarkCheck className="w-4 h-4 text-rose-600" />
            {unmasteredCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1 bg-rose-600 text-white rounded-full text-[9px] font-mono font-bold">
                {unmasteredCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-3 shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-600">언어 / 语言设置:</span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => handleToggleLocale("ko")}
                className={`px-2 py-0.5 rounded ${locale === "ko" ? "bg-white font-bold text-red-600 shadow-xs" : "text-slate-500"}`}
              >
                한국어
              </button>
              <button
                type="button"
                onClick={() => handleToggleLocale("bilingual")}
                className={`px-2 py-0.5 rounded ${locale === "bilingual" ? "bg-white font-bold text-blue-600 shadow-xs" : "text-slate-500"}`}
              >
                双语
              </button>
              <button
                type="button"
                onClick={() => handleToggleLocale("zh")}
                className={`px-2 py-0.5 rounded ${locale === "zh" ? "bg-white font-bold text-slate-900 shadow-xs" : "text-slate-500"}`}
              >
                中文
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-xl bg-slate-50 text-slate-700 text-center border border-slate-200"
            >
              🏠 홈 (모의고사)
            </Link>
            <Link
              href="/words"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-xl bg-amber-50 text-amber-800 text-center border border-amber-200"
            >
              📖 단어장 (1000단어)
            </Link>
            <Link
              href="/mistakes"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-center border border-rose-200"
            >
              📕 오답노트 ({unmasteredCount})
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
