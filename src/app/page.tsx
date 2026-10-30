"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/common/Header";
import { getExamManifest, ExamManifestItem } from "@/services/examService";
import { getRecentExams, RecentExamItem, deleteRecentExam } from "@/utils/storage";
import { getMasteredWordNos } from "@/utils/wordStorage";
import { getLocale, Locale } from "@/utils/i18n";
import { getSectionRangeLabel, formatRecentExamTitle } from "@/utils/timer";
import { isCurrentWeekReportViewed } from "@/utils/weeklyReport";
import {
  getConsecutiveStreakDays,
  getRecentHeatmapData,
  getStudyGoals,
  calculateDDay,
  getStudyActivityMap,
  getTodayKey,
  StudyGoalSettings,
} from "@/utils/studyStats";
import {
  Sparkles,
  Headphones,
  BookOpen,
  Award,
  Play,
  RotateCcw,
  CheckCircle2,
  Trash2,
  ChevronRight,
  Flame,
  BookmarkCheck,
  Languages,
  Clock,
  Layers,
  ArrowRight,
  Bot,
  Sliders,
  FileEdit,
  Upload,
  Calendar,
  Target,
  TrendingUp,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [recents, setRecents] = useState<RecentExamItem[]>([]);
  const [locale, setLocale] = useState<Locale>("ko");
  const [masteredWordCount, setMasteredWordCount] = useState(0);

  // F5 & F6 State
  const [goals, setGoals] = useState<StudyGoalSettings>({
    dailyWordTarget: 20,
    dailyMinuteTarget: 30,
    targetExamDate: "",
  });
  const [streakDays, setStreakDays] = useState(0);
  const [heatmapData, setHeatmapData] = useState<Array<{ date: string; count: number; level: number }>>([]);
  const [todayWords, setTodayWords] = useState(0);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [hasViewedReport, setHasViewedReport] = useState(true);

  useEffect(() => {
    setLocale(getLocale());
    setRecents(getRecentExams());
    setMasteredWordCount(getMasteredWordNos().length);
    setHasViewedReport(isCurrentWeekReportViewed());

    const loadStats = () => {
      const g = getStudyGoals();
      setGoals(g);
      setStreakDays(getConsecutiveStreakDays());
      setHeatmapData(getRecentHeatmapData(35));
      const map = getStudyActivityMap();
      const today = map[getTodayKey()];
      setTodayWords(today?.wordsCount || 0);
      setTodayMinutes(today?.studyMinutes || 0);
      setHasViewedReport(isCurrentWeekReportViewed());
    };

    loadStats();

    const handleLocaleChange = () => setLocale(getLocale());
    const handleWordChange = () => setMasteredWordCount(getMasteredWordNos().length);
    const handleReportChange = () => setHasViewedReport(isCurrentWeekReportViewed());
    window.addEventListener("hsk-locale-changed", handleLocaleChange);
    window.addEventListener("word-progress-changed", handleWordChange);
    window.addEventListener("study-activity-changed", loadStats);
    window.addEventListener("study-goals-changed", loadStats);
    window.addEventListener("eloise-report-viewed-changed", handleReportChange);
    return () => {
      window.removeEventListener("hsk-locale-changed", handleLocaleChange);
      window.removeEventListener("word-progress-changed", handleWordChange);
      window.removeEventListener("study-activity-changed", loadStats);
      window.removeEventListener("study-goals-changed", loadStats);
      window.removeEventListener("eloise-report-viewed-changed", handleReportChange);
    };
  }, []);

  const dDayInfo = calculateDDay(goals.targetExamDate);

  const handleDeleteRecent = (id: string) => {
    deleteRecentExam(id);
    setRecents(getRecentExams());
  };

  const allExams = getExamManifest();
  const hsk4Exams = allExams.filter((e) => e.level === 4);
  const hsk5Exams = allExams.filter((e) => e.level === 5);
  const isZh = locale === "zh";
  const totalQuestionCount = allExams.reduce((sum, e) => sum + e.questionCount, 0);

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-red-50/90 border border-red-200 text-red-700 text-xs font-bold mb-3 sm:mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-red-600" />
            <span>
              {isZh
                ? "Eloise 专属 HSK 4级 & 5级 一站式全真模考与智能词库"
                : "Eloise 맞춤형 HSK 4급 & 5급 올인원 실전 모의고사 & 단어장"}
            </span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-2 sm:mb-3">
            Eloise&apos;s HSK APP 🎓
          </h2>
          <p className="text-xs sm:text-base text-slate-600 leading-relaxed mb-4 sm:mb-6">
            {isZh ? (
              <>
                官方真题 {allExams.length} 套（4级 {hsk4Exams.length} 套 + 5级 {hsk5Exams.length} 套 · 共 {totalQuestionCount} 题）+{" "}
                <strong>核心 1000 词汇闪卡</strong>
                <br className="hidden sm:inline" />
                <strong>逐题深度双语解析</strong> · 支持 HSK 官方机考 CBT 与左右分屏阅读模式
              </>
            ) : (
              <>
                공식 기출 {allExams.length}세트 (4급 {hsk4Exams.length}세트 + 5급 {hsk5Exams.length}세트 · {totalQuestionCount}문항) +{" "}
                <strong>필수 1000단어장</strong>
                <br className="hidden sm:inline" />
                <strong>한국인을 위한 문항별 심층 한국어 해설</strong> · HSK 공식 CBT 및 좌우 분할 독해 지원
              </>
            )}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
              <Headphones className="w-3.5 h-3.5 text-red-600" />
              <span>{isZh ? "内置完整听力原声" : "듣기 MP3 내장"}</span>
            </span>
            <span className="flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
              <Languages className="w-3.5 h-3.5 text-blue-600" />
              <span>{isZh ? "逐题精讲解析" : "한국어 상세 풀이"}</span>
            </span>
            <span className="flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
              <Bot className="w-3.5 h-3.5 text-purple-600" />
              <span>{isZh ? "AI 1对1 私教答疑" : "AI 1:1 과외 튜터"}</span>
            </span>
            <span className="flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>{isZh ? "180分合格线诊断" : "180점 합격선 분석"}</span>
            </span>
          </div>
        </div>

        {/* D-Day & Daily Goals Dashboard (F5, F6) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* 1. D-Day Big Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-700/50 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-red-400" />
                <span>{isZh ? "HSK 目标考试日" : "HSK 목표 시험일"}</span>
              </span>
              <Link
                href="/settings"
                className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
                title={isZh ? "修改目标考试日期" : "목표일 설정 변경"}
              >
                <span>{isZh ? "修改日期" : "설정 변경"}</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="my-2">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
                  {dDayInfo.dDayText}
                </span>
                <span className="text-xs font-bold text-red-400">
                  {dDayInfo.isPast
                    ? isZh
                      ? "考试已结束"
                      : "시험 종료"
                    : dDayInfo.daysLeft === 0
                    ? isZh
                      ? "今日考试！"
                      : "오늘 시험!"
                    : isZh
                    ? "倒计时"
                    : "남음"}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5 flex items-center gap-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{goals.targetExamDate || (isZh ? "未设定目标日期" : "목표 날짜 미설정")}</span>
              </p>
            </div>

            <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
              <span className="text-slate-400">{isZh ? "通关目标" : "합격 목표"}</span>
              <span className="font-bold text-amber-400">{isZh ? "冲刺 HSK 5级 210分+" : "HSK 5급 210점+ 도전"}</span>
            </div>
          </div>

          {/* 2. Daily Goal Progress */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs sm:text-sm font-black text-slate-900">
                  {isZh ? "今日学习目标" : "오늘의 학습 목표"}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-orange-50 text-orange-600 border border-orange-200">
                {isZh ? `🔥 已连续打卡 ${streakDays} 天！` : `🔥 연속 ${streakDays}일 달성 중!`}
              </span>
            </div>

            <div className="space-y-3.5 my-1">
              {/* Words Target Bar */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-slate-600">
                    {isZh
                      ? `📖 单词记忆 (${todayWords} / ${goals.dailyWordTarget}词)`
                      : `📖 단어 학습 (${todayWords} / ${goals.dailyWordTarget}개)`}
                  </span>
                  <span className="font-mono text-slate-900">
                    {Math.min(100, Math.round((todayWords / goals.dailyWordTarget) * 100))}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-red-500 to-rose-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (todayWords / goals.dailyWordTarget) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Study Time Target Bar */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-slate-600">
                    {isZh
                      ? `⏱️ 学习时长 (${todayMinutes} / ${goals.dailyMinuteTarget}分钟)`
                      : `⏱️ 학습 시간 (${todayMinutes} / ${goals.dailyMinuteTarget}분)`}
                  </span>
                  <span className="font-mono text-slate-900">
                    {Math.min(100, Math.round((todayMinutes / goals.dailyMinuteTarget) * 100))}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (todayMinutes / goals.dailyMinuteTarget) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              {todayWords >= goals.dailyWordTarget && todayMinutes >= goals.dailyMinuteTarget ? (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isZh ? "今日学习目标已达成！🎉" : "오늘의 학습 목표 완료! 🎉"}</span>
                </span>
              ) : (
                <span className="text-slate-400">
                  {isZh ? "距离完成今日目标只差一点啦，继续加油！💪" : "목표 달성까지 조금만 더 힘내세요! 💪"}
                </span>
              )}
            </div>
          </div>

          {/* 3. 35-Day Heatmap (GitHub Style) */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-black text-slate-900">
                {isZh ? "近 5 周学习热力图 (Heatmap)" : "최근 5주 학습 잔디 (Heatmap)"}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {isZh ? "35天记录" : "35일 잔디"}
              </span>
            </div>

            <div className="my-auto py-2">
              <div className="grid grid-cols-7 gap-1.5 justify-center">
                {heatmapData.map((day, idx) => {
                  let colorClass = "bg-slate-100 border-slate-200";
                  if (day.level === 1) colorClass = "bg-emerald-200 border-emerald-300";
                  else if (day.level === 2) colorClass = "bg-emerald-400 border-emerald-500";
                  else if (day.level === 3) colorClass = "bg-emerald-600 border-emerald-700";
                  else if (day.level === 4) colorClass = "bg-emerald-800 border-emerald-900";

                  return (
                    <div
                      key={idx}
                      className={`h-5 w-full rounded-md border transition-transform hover:scale-125 cursor-pointer ${colorClass}`}
                      title={isZh ? `${day.date}: ${day.count} 次学习活动` : `${day.date}: ${day.count}회 활동`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Less</span>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-100 border border-slate-200" />
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-200 border border-emerald-300" />
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400 border border-emerald-500" />
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 border border-emerald-700" />
              </div>
              <span>More</span>
            </div>
          </div>
        </div>

        {/* Feature Banner: Vocabulary Memorization Feature */}
        <div className="mb-10 sm:mb-12 bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden group">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 group-hover:skew-x-6 transition-transform" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                  {isZh ? "NEW 核心词库" : "NEW 어휘 특강"}
                </span>
                <span className="text-xs font-bold text-amber-200">
                  {isZh ? "HSK 4级 & 5级 必考 1,000 词" : "HSK 4급 & 5급 필수 1,000단어"}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                {isZh ? "Eloise 专属智能单词闪卡与随堂测验" : "Eloise를 위한 스마트 단어장 & 실전 퀴즈"}
              </h3>
              <p className="text-xs sm:text-sm text-white/90 max-w-xl leading-relaxed">
                {isZh
                  ? "支持艾宾浩斯间隔复习 · 3种测验模式（听音辨义/韩译中/中译韩）· 答错词汇自动收入错题本"
                  : "플래시카드 암기 · 3가지 퀴즈 모드(듣기/한국어/중국어) · 틀린 단어 오답 자동 별표 저장"}
              </p>
              <div className="pt-2 flex items-center gap-4 text-xs font-bold">
                <span className="bg-black/20 px-3 py-1 rounded-xl">
                  {isZh ? `已掌握: ${masteredWordCount} / 1000 词` : `암기 완료: ${masteredWordCount} / 1000 단어`}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
              <Link
                href="/words"
                className="px-6 py-3.5 bg-white text-slate-900 hover:bg-amber-50 font-black rounded-2xl text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-red-600" />
                <span>{isZh ? "进入单词闪卡" : "단어장 열기"}</span>
              </Link>
              <Link
                href="/settings"
                className="px-4 py-3.5 bg-black/20 hover:bg-black/30 text-white font-bold rounded-2xl text-xs sm:text-sm transition border border-white/30 flex items-center justify-center gap-1.5"
              >
                <Sliders className="w-4 h-4" />
                <span>{isZh ? "自定义组卷设置" : "맞춤 시험 설정"}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* NEW Features Duo Banner: 学习周报看板 & 韩国人易错专项 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 sm:mb-12">
          {/* Card 1: 学习周报 */}
          <Link
            href="/report"
            className="p-5 sm:p-6 bg-white/95 backdrop-blur-sm rounded-3xl border border-indigo-200/90 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all flex items-center justify-between group relative"
          >
            {!hasViewedReport && (
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 absolute top-4 right-4 ring-4 ring-red-100 animate-pulse" />
            )}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {isZh ? "学习周报" : "주간 학습 리포트"}
                </span>
                {!hasViewedReport && (
                  <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.2 rounded-full border border-red-200">
                    {isZh ? "本周待查看" : "신규"}
                  </span>
                )}
              </div>
              <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-indigo-600 transition">
                {isZh ? "每周学习复盘与正确率折线图" : "주간 학습 시간 & 정답률 변화 추이"}
              </h4>
              <p className="text-xs text-slate-500">
                {isZh
                  ? "自动统计周一至周日学习时长、做题数、发音跟读与易错题型"
                  : "월~일 누적 학습 시간, 모의고사 정답률 곡선 및 요약 공유"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 ml-3 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </Link>

          {/* Card 2: 韩国人易错专项 */}
          <Link
            href="/pitfalls"
            className="p-5 sm:p-6 bg-white/95 backdrop-blur-sm rounded-3xl border border-purple-200/90 shadow-xs hover:border-purple-400 hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                  {isZh ? "专项特训" : "취약점 훈련"}
                </span>
                <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.2 rounded-full border border-purple-200">
                  5大类
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-purple-600 transition">
                {isZh ? "韩国人学中文最容易错的 5 大专项" : "한국인이 가장 많이 틀리는 5대 문법·어法"}
              </h4>
              <p className="text-xs text-slate-500">
                {isZh
                  ? "声调变调 · 专用量词 · 把字句 · 被字句 · 了与过汉韩对比精讲"
                  : "성조 변조, 전용 양사, 把/被자문, 了/过 오류 완벽 격파"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 ml-3 group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
          </Link>
        </div>

        {/* HSK 4 Section */}
        <section className="mb-10 sm:mb-12">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-xs font-black">
                  LEVEL 4
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  {isZh ? "HSK 4级 官方真题模考" : "HSK 4급 실전 기출 모의고사"}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isZh
                  ? "历年官方真题全收录（听力 45 题 + 阅读 40 题 + 书写 15 题）"
                  : "실제 출제된 정규 기출문제 (듣기 45문항 + 독해 40문항 + 쓰기 15문항)"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hsk4Exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-red-400 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                      {locale === "zh" ? exam.tag : exam.tagKo || exam.tag}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{locale === "zh" ? `${exam.durationMinutes}分钟` : `${exam.durationMinutes}분`}</span>
                      </span>
                      <span>·</span>
                      <span>{locale === "zh" ? `${exam.questionCount}题` : `${exam.questionCount}문항`}</span>
                      <Link
                        href={`/settings?examId=${exam.id}`}
                        className="ml-1 p-1 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                        title={locale === "zh" ? "自定义考试设置" : "맞춤형 시험 설정"}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-red-600 transition mb-1">
                    {locale === "zh" ? exam.title : exam.titleKo || exam.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-3.5">
                    {locale === "zh" ? exam.subTitle : exam.subTitleKo || exam.subTitle}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100">
                  {/* Primary & Review Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/exam/${exam.id}`}
                      className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {locale === "zh"
                          ? `整卷模考 (${exam.questionCount}题)`
                          : `정규 실전 (${exam.questionCount}문항)`}
                      </span>
                    </Link>
                    <Link
                      href={`/review/${exam.id}`}
                      className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{locale === "zh" ? "题目与解析" : "문제 & 해설 보기"}</span>
                    </Link>
                  </div>

                  {/* Section Practice Shortcuts */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <Link
                      href={`/settings?examId=${exam.id}&part=listening`}
                      className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-red-50 hover:text-red-700 text-slate-600 text-[11px] font-bold text-center border border-slate-200/80 transition flex items-center justify-center gap-1"
                    >
                      <Headphones className="w-3 h-3 text-red-500" />
                      <span>{getSectionRangeLabel(exam, "听力", locale)}</span>
                    </Link>
                    <Link
                      href={`/settings?examId=${exam.id}&part=reading`}
                      className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-bold text-center border border-slate-200/80 transition flex items-center justify-center gap-1"
                    >
                      <BookOpen className="w-3 h-3 text-blue-500" />
                      <span>{getSectionRangeLabel(exam, "阅读", locale)}</span>
                    </Link>
                    <Link
                      href={`/settings?examId=${exam.id}&part=writing`}
                      className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-purple-50 hover:text-purple-700 text-slate-600 text-[11px] font-bold text-center border border-slate-200/80 transition flex items-center justify-center gap-1"
                    >
                      <FileEdit className="w-3 h-3 text-purple-500" />
                      <span>{getSectionRangeLabel(exam, "书写", locale)}</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* HSK 5 Section */}
        <section className="mb-10 sm:mb-12">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-xs font-black">
                  LEVEL 5
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  {locale === "zh" ? "HSK 5级 高分挑战专区" : "HSK 5급 고득점 도약관"}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isZh
                  ? "中高级进阶真题模考（100题）· 支持长文阅读与看图写作精讲"
                  : "중고급 도약 실전 모의고사 (100문항) · 장문 독해 및 작문 한국어 해설 지원"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hsk5Exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-200 p-4 sm:p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {locale === "zh" ? exam.tag : exam.tagKo || exam.tag}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{locale === "zh" ? `${exam.durationMinutes}分钟` : `${exam.durationMinutes}분`}</span>
                      </span>
                      <span>·</span>
                      <span>{locale === "zh" ? `${exam.questionCount}题` : `${exam.questionCount}문항`}</span>
                      <Link
                        href={`/settings?examId=${exam.id}`}
                        className="ml-1 p-1 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                        title={locale === "zh" ? "自定义考试设置" : "맞춤형 시험 설정"}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition mb-1">
                    {locale === "zh" ? exam.title : exam.titleKo || exam.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-3.5">
                    {locale === "zh" ? exam.subTitle : exam.subTitleKo || exam.subTitle}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/exam/${exam.id}`}
                      className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {locale === "zh"
                          ? `整卷模考 (${exam.questionCount}题)`
                          : `정규 실전 (${exam.questionCount}문항)`}
                      </span>
                    </Link>
                    <Link
                      href={`/review/${exam.id}`}
                      className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{locale === "zh" ? "题目与解析" : "문제 & 해설 보기"}</span>
                    </Link>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <Link
                      href={`/settings?examId=${exam.id}&part=listening`}
                      className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-bold text-center border border-slate-200/80 transition flex items-center justify-center gap-1"
                    >
                      <Headphones className="w-3 h-3 text-blue-500" />
                      <span>{getSectionRangeLabel(exam, "听力", locale)}</span>
                    </Link>
                    <Link
                      href={`/settings?examId=${exam.id}&part=reading`}
                      className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-bold text-center border border-slate-200/80 transition flex items-center justify-center gap-1"
                    >
                      <BookOpen className="w-3 h-3 text-blue-500" />
                      <span>{getSectionRangeLabel(exam, "阅读", locale)}</span>
                    </Link>
                    <Link
                      href={`/settings?examId=${exam.id}&part=writing`}
                      className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-purple-50 hover:text-purple-700 text-slate-600 text-[11px] font-bold text-center border border-slate-200/80 transition flex items-center justify-center gap-1"
                    >
                      <FileEdit className="w-3 h-3 text-purple-500" />
                      <span>{getSectionRangeLabel(exam, "书写", locale)}</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Exam History */}
        {recents.length > 0 && (
          <section className="mb-10">
            <h3 className="text-xs sm:text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>
                {locale === "zh"
                  ? `最近模考与练习记录 (${recents.length}条)`
                  : `최근 응시 및 학습 기록 (${recents.length}개)`}
              </span>
            </h3>

            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
              {recents.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        item.status === "submitted"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {item.status === "submitted" ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                        {formatRecentExamTitle(item, locale)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.status === "submitted"
                          ? locale === "zh"
                            ? `已交卷 (最终得分: ${item.score !== undefined ? `${item.score}分` : "已批改"})`
                            : `제출 완료 (최종 점수: ${item.score !== undefined ? `${item.score}점` : "채점 완료"})`
                          : locale === "zh"
                          ? "作答进行中 · 可继续做题"
                          : "응시 진행 중 · 이어서 풀기 가능"}
                        {" · "}
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={item.status === "submitted" ? `/result/${item.id}` : `/exam/${item.id}`}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        item.status === "submitted"
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                    >
                      <span>
                        {item.status === "submitted"
                          ? locale === "zh"
                            ? "成绩单"
                            : "성적표"
                          : locale === "zh"
                          ? "继续做题"
                          : "이어풀기"}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDeleteRecent(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title={locale === "zh" ? "删除记录" : "기록 삭제"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
