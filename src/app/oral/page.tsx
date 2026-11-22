"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/common/Header";
import { getLocale, Locale } from "@/utils/i18n";
import {
  ORAL_SCENARIOS,
  ORAL_CATEGORY_META,
  FREE_TALK_TOPICS,
} from "@/data/oralScenarios";
import { oralStorage } from "@/lib/oral/storage";
import { OralCategory, OralScenarioProgress } from "@/types/oral";
import OralLoginGate from "@/components/oral/OralLoginGate";
import PhrasebookView from "@/components/oral/PhrasebookView";
import {
  MessageCircle,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Loader2,
  ArrowRight,
  Wand2,
} from "lucide-react";

export default function OralStudioPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("ko");
  const [activeTab, setActiveTab] = useState<"scenarios" | "phrasebook">(
    "scenarios"
  );
  const [selectedCategory, setSelectedCategory] = useState<
    OralCategory | "all"
  >("all");
  const [freeTalkTopic, setFreeTalkTopic] = useState("");
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

  const filteredScenarios =
    selectedCategory === "all"
      ? ORAL_SCENARIOS
      : ORAL_SCENARIOS.filter((s) => s.category === selectedCategory);

  const handleStartFreeTalk = (topic?: string) => {
    const q = (topic ?? freeTalkTopic).trim();
    if (q) {
      router.push(`/oral/free-talk?topic=${encodeURIComponent(q)}`);
    } else {
      router.push("/oral/free-talk");
    }
  };

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
          <OralLoginGate isZh={isZh} onAuthorized={() => setAuthorized(true)} />
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
                      ? "16 个中国高频生活场景 + 无限自由对话 + SM-2 表达卡片复习（支持语音与中韩混说）。"
                      : "16가지 중국 현지 실전 상황 + 무제한 프리토킹 + SM-2 단어장 복습 (한국어 섞어 말해도 OK!)."}
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
                        ? `场景与自由聊 (${ORAL_SCENARIOS.length})`
                        : `상황·자유대화 (${ORAL_SCENARIOS.length})`}
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
              <div className="space-y-6">
                {/* Free Talk Card */}
                <div className="bg-white rounded-3xl border border-indigo-200/80 shadow-sm p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg">
                          ✨
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-slate-900">
                          {isZh
                            ? "自由对话 · Free Talk（无剧本畅聊）"
                            : "자유 대화 · Free Talk (주제 무관 프리토킹)"}
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600">
                        {isZh
                          ? "想聊日常近况、追剧美食，或自己设定任意对话角色，随时用语音/文字开聊（支持实时通话）。"
                          : "오늘 있었던 일, 드라마·맛집 이야기, 혹은 원하는 상황을 직접 입력해 자유롭게 중국어로 대화해 보세요!"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartFreeTalk()}
                      className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm transition shrink-0"
                    >
                      <Wand2 className="w-4 h-4" />
                      <span>{isZh ? "立即开始自由对话" : "프리토킹 시작하기"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quick Topic Chips + Custom Topic Input */}
                  <div className="flex flex-wrap gap-2">
                    {FREE_TALK_TOPICS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleStartFreeTalk(t.promptTopic)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/80 text-indigo-800 text-xs font-bold transition"
                      >
                        💬 {isZh ? t.labelZh : t.labelKo}
                      </button>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleStartFreeTalk();
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={freeTalkTopic}
                      onChange={(e) => setFreeTalkTopic(e.target.value)}
                      placeholder={
                        isZh
                          ? "或输入你想聊的自定义话题/场景（如：和房东谈降房租 / 聊聊周末旅行）..."
                          : "원하는 대화 주제나 상황을 직접 입력해 보세요 (예: 집주인과 월세 협상, 주말 여행 수다)..."
                      }
                      className="flex-1 min-h-[42px] px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                    <button
                      type="submit"
                      className="min-h-[42px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0 transition"
                    >
                      {isZh ? "按此话题开聊" : "이 주제로 대화"}
                    </button>
                  </form>
                </div>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {ORAL_CATEGORY_META.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                        selectedCategory === cat.id
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {isZh ? cat.labelZh : cat.labelKo}
                    </button>
                  ))}
                </div>

                {/* Scenario Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredScenarios.map((sc) => {
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
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                {sc.script.length} {isZh ? "句" : "문장"}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                {sc.difficulty}
                              </span>
                            </div>
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
