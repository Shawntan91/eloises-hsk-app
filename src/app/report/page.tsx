"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Header from "@/components/common/Header";
import {
  getWeeklyReport,
  markCurrentWeekReportViewed,
  generateWeeklyTextSummary,
  WeeklyReportData,
} from "@/utils/weeklyReport";
import { getLocale, Locale } from "@/utils/i18n";
import {
  Calendar,
  Clock,
  Flame,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Check,
  Award,
  BookOpen,
  Mic,
  AlertTriangle,
  Sparkles,
  ArrowLeft,
  Share2,
} from "lucide-react";

export default function WeeklyReportPage() {
  const [locale, setLocale] = useState<Locale>("ko");
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = this week, -1 = last week, etc.
  const [report, setReport] = useState<WeeklyReportData | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const isZh = locale === "zh";

  useEffect(() => {
    setLocale(getLocale());
    const handleLocaleChange = () => setLocale(getLocale());
    window.addEventListener("hsk-locale-changed", handleLocaleChange);
    return () => window.removeEventListener("hsk-locale-changed", handleLocaleChange);
  }, []);

  useEffect(() => {
    const data = getWeeklyReport(weekOffset);
    setReport(data);

    // If viewing current week, mark as viewed to clear red dot
    if (weekOffset === 0) {
      markCurrentWeekReportViewed();
    }
  }, [weekOffset]);

  const handleCopySummary = async () => {
    if (!report) return;
    try {
      const summary = generateWeeklyTextSummary(report, isZh ? "zh" : "ko");
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleExportImage = () => {
    if (!report) return;
    setIsExporting(true);

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1450;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsExporting(false);
      return;
    }

    // Gradient Background
    const bg = ctx.createLinearGradient(0, 0, 1080, 1450);
    bg.addColorStop(0, "#0f172a");
    bg.addColorStop(0.5, "#1e1b4b");
    bg.addColorStop(1, "#0f172a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1080, 1450);

    // Header box
    ctx.fillStyle = "#ffffff";
    ctx.roundRect?.(60, 60, 960, 1330, 32);
    ctx.fill();

    // Title
    ctx.fillStyle = "#dc2626";
    ctx.font = "900 26px sans-serif";
    ctx.fillText("ELOISE'S HSK WEEKLY REPORT", 100, 140);

    ctx.fillStyle = "#0f172a";
    ctx.font = "900 42px sans-serif";
    ctx.fillText(isZh ? "HSK 学习周报看板" : "HSK 주간 학습 리포트", 100, 205);

    ctx.fillStyle = "#64748b";
    ctx.font = "bold 20px monospace";
    ctx.fillText(`📅 ${report.weekLabel}`, 100, 245);

    // Key Stats Grid in Export
    const metrics = [
      {
        label: isZh ? "总学习时长" : "총 학습 시간",
        val: `${report.totalDurationMinutes} 分钟`,
        color: "#2563eb",
      },
      {
        label: isZh ? "打卡出勤" : "출석 일수",
        val: `${report.activeStudyDays} 天`,
        color: "#059669",
      },
      {
        label: isZh ? "连续打卡" : "연속 출석",
        val: `${report.consecutiveStreakDays} 天`,
        color: "#ea580c",
      },
      {
        label: isZh ? "模考刷题" : "모의고사 풀이",
        val: `${report.totalQuestions} 题`,
        color: "#dc2626",
      },
      {
        label: isZh ? "平均正确率" : "평균 정답률",
        val: `${report.accuracyRate}%`,
        color: "#7c3aed",
      },
      {
        label: isZh ? "跟读平均分" : "평균 발음 점수",
        val: `${report.avgShadowingScore} 分`,
        color: "#0891b2",
      },
    ];

    metrics.forEach((m, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 100 + col * 450;
      const y = 300 + row * 130;

      ctx.fillStyle = "#f8fafc";
      ctx.roundRect?.(x, y, 410, 105, 20);
      ctx.fill();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText(m.label, x + 24, y + 42);

      ctx.fillStyle = m.color;
      ctx.font = "900 36px monospace";
      ctx.fillText(m.val, x + 24, y + 85);
    });

    // Top Mistakes section
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 26px sans-serif";
    ctx.fillText(isZh ? "⚠️ 本周易错薄弱分类 TOP 3" : "⚠️ 주간 취약 영역 TOP 3", 100, 750);

    if (report.topMistakeCategories.length > 0) {
      report.topMistakeCategories.forEach((c, i) => {
        const y = 800 + i * 75;
        ctx.fillStyle = "#fff1f2";
        ctx.roundRect?.(100, y, 880, 60, 16);
        ctx.fill();

        ctx.fillStyle = "#b91c1c";
        ctx.font = "900 20px sans-serif";
        ctx.fillText(`#${i + 1} ${isZh ? c.nameZh : c.nameKo}`, 130, y + 38);

        ctx.fillStyle = "#64748b";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText(`${c.count} ${isZh ? "道错题" : "문항"}`, 880, y + 38);
      });
    } else {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "18px sans-serif";
      ctx.fillText(isZh ? "本周未产生明显错题，掌握极好！" : "이번 주 기록된 오답이 없습니다.", 100, 820);
    }

    // Footer
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("Eloise's HSK APP · 步步为营，每周进步看得见", 100, 1340);

    // Download blob
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Eloise_HSK_周报_${report.weekId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
      setIsExporting(false);
    }, "image/png");
  };

  if (!report) return null;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Header
        title={isZh ? "学习周报看板" : "학습 주간 리포트"}
        subtitle={isZh ? "全方位复盘每周学习时长、刷题量与正确率趋势" : "학습 시간, 풀이 문항 수, 정답률 추이 한눈에 보기"}
        rightElement={
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isZh ? "返回首页" : "홈으로"}</span>
          </Link>
        }
      />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Week Switcher Bar */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={weekOffset <= -11}
              onClick={() => setWeekOffset((o) => o - 1)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              title={isZh ? "上一周" : "이전 주"}
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-600" />
              <span className="font-mono font-bold text-xs sm:text-sm text-slate-900">
                {report.weekLabel}
              </span>
              {report.isCurrentWeek && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-600 border border-red-200">
                  {isZh ? "本周 (实时)" : "이번 주"}
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={weekOffset >= 0}
              onClick={() => setWeekOffset((o) => o + 1)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              title={isZh ? "下一周" : "다음 주"}
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? (isZh ? "已复制！" : "복사 완료!") : (isZh ? "复制文字摘要" : "요약 복사")}</span>
            </button>

            <button
              type="button"
              onClick={handleExportImage}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? (isZh ? "生成中..." : "생성 중...") : (isZh ? "导出海报图片" : "이미지 저장")}</span>
            </button>
          </div>
        </div>

        {/* 6 Key Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* 1. Duration */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>{isZh ? "学习时长" : "학습 시간"}</span>
              </span>
              {report.comparison.durationDelta !== 0 && (
                <span
                  className={`text-[10px] font-mono font-bold flex items-center ${
                    report.comparison.durationDelta > 0 ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  {report.comparison.durationDelta > 0 ? "↑" : "↓"}
                  {Math.abs(report.comparison.durationDelta)}%
                </span>
              )}
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {report.totalDurationMinutes} <span className="text-xs font-normal text-slate-400">{isZh ? "分钟" : "분"}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {isZh ? `${report.activeStudyDays} 天打卡学习` : `${report.activeStudyDays}일 출석`}
            </div>
          </div>

          {/* 2. Streak */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="text-xs text-slate-400 font-bold flex items-center gap-1 mb-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span>{isZh ? "连续打卡" : "연속 출석"}</span>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {report.consecutiveStreakDays} <span className="text-xs font-normal text-slate-400">{isZh ? "天" : "일"}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {isZh ? "坚持就是胜利！" : "꾸준함이 힘입니다!"}
            </div>
          </div>

          {/* 3. Questions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-bold flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-red-500" />
                <span>{isZh ? "模考刷题" : "문제 풀이"}</span>
              </span>
              {report.comparison.questionsDelta !== 0 && (
                <span
                  className={`text-[10px] font-mono font-bold ${
                    report.comparison.questionsDelta > 0 ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  {report.comparison.questionsDelta > 0 ? "↑" : "↓"}
                  {Math.abs(report.comparison.questionsDelta)}%
                </span>
              )}
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {report.totalQuestions} <span className="text-xs font-normal text-slate-400">{isZh ? "题" : "문항"}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {isZh ? `平均正确率 ${report.accuracyRate}%` : `평균 정답률 ${report.accuracyRate}%`}
            </div>
          </div>

          {/* 4. Words */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="text-xs text-slate-400 font-bold flex items-center gap-1 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{isZh ? "单词记忆" : "어휘 암기"}</span>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {report.newWordsCount + report.reviewedWordsCount}{" "}
              <span className="text-xs font-normal text-slate-400">{isZh ? "词" : "단어"}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {isZh
                ? `新学 ${report.newWordsCount} · 复习 ${report.reviewedWordsCount}`
                : `신규 ${report.newWordsCount}개 · 복습 ${report.reviewedWordsCount}개`}
            </div>
          </div>

          {/* 5. Shadowing */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="text-xs text-slate-400 font-bold flex items-center gap-1 mb-1">
              <Mic className="w-3.5 h-3.5 text-purple-500" />
              <span>{isZh ? "跟读口语" : "음성跟读"}</span>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {report.shadowingCount} <span className="text-xs font-normal text-slate-400">{isZh ? "次" : "회"}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {isZh ? `平均发音 ${report.avgShadowingScore} 分` : `평균 ${report.avgShadowingScore}점`}
            </div>
          </div>

          {/* 6. Overall Rate */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="text-xs text-slate-400 font-bold flex items-center gap-1 mb-1">
              <Award className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isZh ? "综合正确率" : "종합 정답률"}</span>
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono">
              {report.accuracyRate}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {report.accuracyRate >= 60 ? (isZh ? "已达 HSK 合格线 180+" : "합격선 180점 통과") : (isZh ? "继续努力" : "목표를 향해!")}
            </div>
          </div>
        </div>

        {/* SVG Daily Trend Chart (Pure SVG, Mon - Sun) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-600" />
              <h4 className="font-black text-slate-900 text-sm sm:text-base">
                {isZh ? "周一至周日刷题量与正确率趋势" : "요일별 풀이 문항 수 및 정답률 추이"}
              </h4>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-blue-400" />
                <span>{isZh ? "做题数" : "문항 수"}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                <span>{isZh ? "正确率 (%)" : "정답률 (%)"}</span>
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <svg viewBox="0 0 700 240" className="w-full min-w-[500px] h-48 select-none font-sans">
              {/* Grid Lines */}
              <line x1="40" y1="30" x2="680" y2="30" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="80" x2="680" y2="80" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="130" x2="680" y2="130" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="180" x2="680" y2="180" stroke="#e2e8f0" strokeWidth="1" />

              {/* 60% Pass Threshold dotted line */}
              <line
                x1="40"
                y1="90"
                x2="680"
                y2="90"
                stroke="rgba(16, 185, 129, 0.4)"
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />
              <text x="45" y="85" fill="#10b981" fontSize="10" fontWeight="bold">
                {isZh ? "合格基准 60%" : "합격 기준 60%"}
              </text>

              {/* Render Bars for Question Count */}
              {report.dailyMetrics.map((d, i) => {
                const x = 75 + i * 88;
                const maxQ = Math.max(50, ...report.dailyMetrics.map((m) => m.questions));
                const barHeight = (d.questions / maxQ) * 110;
                const barY = 180 - barHeight;

                return (
                  <g key={i}>
                    {/* Bar */}
                    <rect
                      x={x - 14}
                      y={barY}
                      width="28"
                      height={barHeight}
                      rx="6"
                      fill="#93c5fd"
                      opacity="0.85"
                    />
                    {d.questions > 0 && (
                      <text
                        x={x}
                        y={barY - 4}
                        textAnchor="middle"
                        fill="#3b82f6"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {d.questions}
                      </text>
                    )}
                    {/* X axis Day Label */}
                    <text
                      x={x}
                      y="202"
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      {isZh ? d.dayLabelZh : d.dayLabelKo}
                    </text>
                    <text
                      x={x}
                      y="218"
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {d.dateStr.slice(5)}
                    </text>
                  </g>
                );
              })}

              {/* Accuracy Line Points */}
              {(() => {
                const validPoints: Array<{ x: number; y: number; acc: number }> = [];
                report.dailyMetrics.forEach((d, i) => {
                  if (d.accuracy !== null) {
                    const x = 75 + i * 88;
                    const y = 180 - (d.accuracy / 100) * 150;
                    validPoints.push({ x, y, acc: d.accuracy });
                  }
                });

                if (validPoints.length < 1) return null;

                const pathData = validPoints
                  .map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
                  .join(" ");

                return (
                  <g>
                    <path d={pathData} fill="none" stroke="#dc2626" strokeWidth="3" strokeLinejoin="round" />
                    {validPoints.map((p, idx) => (
                      <g key={idx}>
                        <circle cx={p.x} cy={p.y} r="4.5" fill="#ffffff" stroke="#dc2626" strokeWidth="2.5" />
                        <text
                          x={p.x}
                          y={p.y - 8}
                          textAnchor="middle"
                          fill="#dc2626"
                          fontSize="10"
                          fontWeight="900"
                          fontFamily="monospace"
                        >
                          {p.acc}%
                        </text>
                      </g>
                    ))}
                  </g>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* Top 3 Mistake Categories */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h4 className="font-black text-slate-900 text-sm sm:text-base">
              {isZh ? "本周高频错题薄弱点 TOP 3" : "주간 취약 문항 영역 TOP 3"}
            </h4>
          </div>

          {report.topMistakeCategories.length > 0 ? (
            <div className="space-y-3">
              {report.topMistakeCategories.map((cat, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-red-100 text-red-700 font-mono font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        {isZh ? cat.nameZh : cat.nameKo}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-xl">
                    {cat.count} {isZh ? "道错题" : "문항"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-slate-600">
                {isZh ? "本周未产生明显错题，做题状态极佳！" : "이번 주 기록된 오답이 없습니다. 훌륭합니다!"}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
