"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Header from "@/components/common/Header";
import { getLocale, Locale } from "@/utils/i18n";
import { getOralScenarioById } from "@/data/oralScenarios";
import { OralMode } from "@/types/oral";
import OralLoginGate from "@/components/oral/OralLoginGate";
import ShadowingMode from "@/components/oral/ShadowingMode";
import RoleplayMode from "@/components/oral/RoleplayMode";
import LiveCallMode from "@/components/oral/LiveCallMode";
import {
  ArrowLeft,
  Headphones,
  MessageSquare,
  PhoneCall,
  Loader2,
} from "lucide-react";

export default function OralScenarioDetailPage() {
  const params = useParams<{ id: string }>();
  const scenarioId = params?.id || "";
  const scenario = getOralScenarioById(scenarioId);

  const [locale, setLocale] = useState<Locale>("ko");
  const [mode, setMode] = useState<OralMode>("shadowing");
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(true);

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

    return () => {
      window.removeEventListener("hsk-locale-changed", handleLocaleChange);
    };
  }, []);

  const isZh = locale === "zh";

  if (!scenario) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
        <Header />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-16 text-center">
          <p className="text-base font-bold text-slate-700 mb-4">
            {isZh ? "未找到该生活口语场景。" : "해당 회화 상황을 찾을 수 없습니다."}
          </p>
          <Link
            href="/oral"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isZh ? "返回场景列表" : "목록으로 돌아가기"}</span>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Header
        title={isZh ? scenario.titleZh : scenario.titleKo}
        subtitle={`${scenario.icon} ${isZh ? scenario.titleKo : scenario.titleZh}`}
      />

      <main className="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-4">
        {!authChecked ? (
          <div className="flex items-center justify-center py-20 text-slate-500 gap-2 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span>{isZh ? "加载中..." : "불러오는 중..."}</span>
          </div>
        ) : !authorized ? (
          <OralLoginGate isZh={isZh} onAuthorized={() => setAuthorized(true)} />
        ) : (
          <>
            {/* Top Bar + Mode Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Link
                  href="/oral"
                  className="min-w-[40px] min-h-[40px] p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5">
                    <span>{scenario.icon}</span>
                    <span>{isZh ? scenario.titleZh : scenario.titleKo}</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isZh ? scenario.personaZh : scenario.personaRoleKo}
                  </p>
                </div>
              </div>

              {/* 3-Tab Mode Selector (Phase 2 Live Tab pre-reserved) */}
              <div className="flex items-center bg-slate-200/70 p-1 rounded-2xl self-start sm:self-auto overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setMode("shadowing")}
                  className={`min-h-[40px] px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
                    mode === "shadowing"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>{isZh ? "听读保温" : "듣기·따라하기"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("roleplay")}
                  className={`min-h-[40px] px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
                    mode === "roleplay"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{isZh ? "AI 实战" : "AI 롤플레이"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("live")}
                  className={`min-h-[40px] px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
                    mode === "live"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>{isZh ? "实时语音通话" : "실시간 통화"}</span>
                </button>
              </div>
            </div>

            {/* Active Mode View */}
            {mode === "shadowing" && (
              <ShadowingMode scenario={scenario} isZh={isZh} />
            )}

            {mode === "roleplay" && (
              <RoleplayMode scenario={scenario} isZh={isZh} />
            )}

            {mode === "live" && (
              <LiveCallMode
                scenario={scenario}
                isZh={isZh}
                onSwitchToRoleplay={() => setMode("roleplay")}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
