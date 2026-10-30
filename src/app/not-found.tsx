"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/common/Header";
import { getLocale } from "@/utils/i18n";
import { Compass, Home, BookOpen, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const [locale, setLocale] = useState("ko");

  useEffect(() => {
    setLocale(getLocale());
  }, []);

  const isKo = locale === "ko";

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Header />

      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-md max-w-lg w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-inner">
            <Compass className="w-8 h-8 animate-pulse" />
          </div>

          <div>
            <span className="font-mono text-3xl sm:text-4xl font-black text-red-600 block mb-1">
              404
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isKo ? "페이지를 찾을 수 없습니다" : "页面走丢了 (Page Not Found)"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
              {isKo
                ? "요청하신 페이지가 삭제되었거나 이동되었습니다. 아래 버튼을 눌러 메인 홈이나 단어장으로 이동하세요."
                : "您访问的链接不存在或已转移，请返回主页继续刷题备考。"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>{isKo ? "메인 홈으로 이동" : "返回考场首页"}</span>
            </Link>
            <Link
              href="/words"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span>{isKo ? "HSK 필수 단어장" : "1000 必备词汇"}</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
