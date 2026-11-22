"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/common/Header";
import { getLocale, Locale } from "@/utils/i18n";
import { ORAL_SCENARIOS } from "@/data/oralScenarios";
import { oralStorage } from "@/lib/oral/storage";
import { OralScenarioProgress } from "@/types/oral";
import OralAuthGate from "@/components/oral/OralAuthGate";
import PhrasebookView from "@/components/oral/PhrasebookView";
import {
  MessageCircle,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react";

export default function OralStudioPage() {
  const [locale, setLocale] = useState<Locale>("ko");
  const [activeTab, setActiveTab] = useState<"scenarios" | "phrasebook">(
    "scenarios"
  );
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(true);
  const [progressMap, setProgressMap] = useState<
    Record<string, OralScenarioProgress>
  >({});
  const [phraseCount, setPhraseCount] = useState(0);

  useEffect(() => {
    setLocale(getLocale());
    const handleLocaleChange = () => setLocale(getLocale());
    window.addEventListener("hsk-locale-changed", handleLocaleChange);

    const checkAuth = async () => {
      try {
        const res = await fetch("/api/oral/auth");
        const data = await res.json();
        setAuthorized(!data.authRequired || Boolean(data.authorized));
      } catch {
        setAuthorized(true);
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();

    const loadProgress = async () => {
      const [pMap, phrases] = await Promise.all([
        oralStorage.getAllScenarioProgress(),
        oralStorage.getPhrases(),
      ]);
      setProgressMap(pMap);
      setPhraseCount(phrases.length);
    };
    loadProgress();

    window.addEventListener("oral-progress-changed", loadProgress);
    window.addEventListener("oral-phrasebook-changed", loadProgress);

    return () => {
      window.removeEventListener("hsk-locale-changed", handleLocaleChange);
      window.removeEventListener("oral-progress-changed", loadProgress);
      window.removeEventListener("oral-phrasebook-changed", loadProgress);
    };
  }, []);

  const isZh = locale === "zh";

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Header
        title={isZh ? "中国生活情景口语" : "중국 생활 회화 스튜디오"}
        subtitle={
          isZh
            ? "每天 5~10 分钟，地道日常中文不退步"
            : "하루 5~10분, 중국 현지 실전 회화 감각 유지하기"
        }
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {!authChecked ? (
          <div className="flex items-center justify-center py-20 text-slate-500 gap-2 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span>{isZh ? "加载中..." : "불러오는 중..."}</span>
          </div>
        ) : !authorized ? (
          <OralAuthGate isZh={isZh} onAuthorized={() => setAuthorized(true)} />
        ) : (
          <div className="space-y-6">
            {/* Hero Banner */}
            <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl p-5 sm:p-7 text-white shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold mb-2.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {isZh
                        ? "Eloise 专属 · HSK 4~5 实战口语"
                        : "Eloise 전용 · HSK 4~5급 생활 회화"}
                    </span>
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                    {isZh
                      ? "中国生活情景口语工作室"
                      : "중국 현지 생활 회화 스튜디오"}
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-50/90 mt-1 max-w-2xl">
                    {isZh
                      ? "先听读地道示范对话找回语感，再和 AI 角色扮演实战（支持语音与中韩混说）。"
                      : "먼저 원어민 실전 대화를 듣고 따라 읽은 뒤, AI와 롤플레이로 연습해 보세요 (한국어 섞어 말해도 OK!)."}
                  </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center bg-black/20 p-1 rounded-2xl shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab("scenarios")}
                    className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      activeTab === "scenarios"
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-white/90 hover:text-white"
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>
                      {isZh
                        ? `生活场景 (${ORAL_SCENARIOS.length})`
                        : `상황별 회화 (${ORAL_SCENARIOS.length})`}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("phrasebook")}
                    className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      activeTab === "phrasebook"
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-white/90 hover:text-white"
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>
                      {isZh
                        ? `表达收藏本 (${phraseCount})`
                        : `표현 단어장 (${phraseCount})`}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {activeTab === "scenarios" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {ORAL_SCENARIOS.map((sc) => {
                  const prog = progressMap[sc.id];
                  const doneCount = prog?.completedGoalIds?.length || 0;
                  const totalGoals = sc.goals.length;
                  const isCompleted = doneCount >= totalGoals;

                  return (
                    <Link
                      key={sc.id}
                      href={`/oral/${sc.id}`}
                      className="group bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md p-5 flex flex-col justify-between transition"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className="text-3xl leading-none">
                            {sc.icon}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            {sc.difficulty}
                          </span>
                        </div>

                        <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-700 transition">
                          {isZh ? sc.titleZh : sc.titleKo}
                        </h3>
                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                          {isZh ? sc.titleKo : sc.titleZh}
                        </p>
                        <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                          {isZh ? sc.descZh : sc.descKo}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            isCompleted
                              ? "text-emerald-600"
                              : "text-slate-500"
                          }`}
                        >
                          {isCompleted && (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isZh
                              ? `目标 ${doneCount}/${totalGoals}`
                              : `미션 ${doneCount}/${totalGoals}`}
                          </span>
                        </span>

                        <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                          <span>{isZh ? "开始" : "시작"}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <PhrasebookView isZh={isZh} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
