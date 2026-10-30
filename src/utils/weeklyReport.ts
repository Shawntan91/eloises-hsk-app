"use client";

import { getActivityLogs, ActivityLogEntry } from "./activityLogger";
import { getShadowingRecords, ShadowingRecord } from "./speechScoring";
import { getMistakeBank, MistakeItem } from "./mistakeBank";
import { getRecentExams } from "./storage";
import { getConsecutiveStreakDays } from "./studyStats";

export interface DayMetric {
  dateStr: string; // YYYY-MM-DD
  dayLabelZh: string; // "周一", "周二"...
  dayLabelKo: string; // "월", "화"...
  questions: number;
  correct: number;
  accuracy: number | null; // 0-100 or null if 0 questions
  durationMinutes: number;
}

export interface WeeklyReportData {
  weekId: string;
  weekLabel: string;
  startDateStr: string;
  endDateStr: string;
  isCurrentWeek: boolean;
  hasData: boolean;

  // Key metrics
  totalDurationMinutes: number;
  activeStudyDays: number;
  consecutiveStreakDays: number;
  newWordsCount: number;
  reviewedWordsCount: number;
  totalQuestions: number;
  accuracyRate: number;
  shadowingCount: number;
  avgShadowingScore: number;

  // Daily trend (Mon - Sun, exactly 7 days)
  dailyMetrics: DayMetric[];

  // Week-over-week comparison (this week vs last week, in % delta)
  comparison: {
    durationDelta: number; // e.g. +15 or -10
    questionsDelta: number;
    accuracyDelta: number;
    wordsDelta: number;
  };

  // Top 3 mistake categories
  topMistakeCategories: Array<{
    nameZh: string;
    nameKo: string;
    count: number;
  }>;
}

const VIEWED_KEY = "eloise_weekly_report_viewed";

/**
 * Get start and end timestamp of a Monday-Sunday week
 * weekOffset: 0 = current week, -1 = last week, etc.
 */
export function getWeekDateRange(weekOffset = 0): {
  startMs: number;
  endMs: number;
  startDateStr: string;
  endDateStr: string;
  weekId: string;
  weekLabel: string;
  dayStartTimestamps: Array<{ dateStr: string; dayIndex: number; startMs: number; endMs: number }>;
} {
  const now = new Date();
  // Adjust to Monday
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day + weekOffset * 7;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const startMs = monday.getTime();
  const endMs = sunday.getTime();

  const formatDate = (d: Date) =>
    `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;

  const startDateStr = formatDate(monday);
  const endDateStr = formatDate(sunday);
  const weekId = `${monday.getFullYear()}-W${String(getWeekNumber(monday)).padStart(2, "0")}`;
  const weekLabel = `${startDateStr} ~ ${endDateStr}`;

  const dayStartTimestamps = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    cur.setHours(0, 0, 0, 0);
    const start = cur.getTime();
    cur.setHours(23, 59, 59, 999);
    const end = cur.getTime();
    const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(
      cur.getDate()
    ).padStart(2, "0")}`;
    dayStartTimestamps.push({ dateStr, dayIndex: i, startMs: start, endMs: end });
  }

  return {
    startMs,
    endMs,
    startDateStr,
    endDateStr,
    weekId,
    weekLabel,
    dayStartTimestamps,
  };
}

function getWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

export function isCurrentWeekReportViewed(): boolean {
  if (typeof window === "undefined") return true;
  const currentWeek = getWeekDateRange(0).weekId;
  const viewed = localStorage.getItem(VIEWED_KEY);
  return viewed === currentWeek;
}

export function markCurrentWeekReportViewed(): void {
  if (typeof window === "undefined") return;
  const currentWeek = getWeekDateRange(0).weekId;
  localStorage.setItem(VIEWED_KEY, currentWeek);
  window.dispatchEvent(new Event("eloise-report-viewed-changed"));
}

/**
 * Computes the complete weekly report data for a given week offset
 */
export function getWeeklyReport(weekOffset = 0): WeeklyReportData {
  const weekInfo = getWeekDateRange(weekOffset);
  const lastWeekInfo = getWeekDateRange(weekOffset - 1);

  const allLogs = getActivityLogs();
  const allShadowing = getShadowingRecords();
  const allMistakes = getMistakeBank();
  const allExams = getRecentExams();
  const streakDays = getConsecutiveStreakDays();

  // Filter items in this week
  const weekLogs = allLogs.filter((l) => l.ts >= weekInfo.startMs && l.ts <= weekInfo.endMs);
  const lastWeekLogs = allLogs.filter(
    (l) => l.ts >= lastWeekInfo.startMs && l.ts <= lastWeekInfo.endMs
  );

  const weekShadowing = allShadowing.filter(
    (s) => s.timestamp >= weekInfo.startMs && s.timestamp <= weekInfo.endMs
  );

  // Compute Daily metrics (Mon - Sun)
  const ZH_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const KO_DAYS = ["월", "화", "수", "목", "금", "토", "일"];

  let totalQuestions = 0;
  let totalCorrect = 0;
  let totalDurationSec = 0;
  let newWords = 0;
  let reviewedWords = 0;

  const activeDatesSet = new Set<string>();

  const dailyMetrics: DayMetric[] = weekInfo.dayStartTimestamps.map((daySlot, idx) => {
    const dayLogs = weekLogs.filter(
      (l) => l.ts >= daySlot.startMs && l.ts <= daySlot.endMs
    );

    let dayQ = 0;
    let dayCor = 0;
    let daySec = 0;

    dayLogs.forEach((l) => {
      daySec += l.durationSec || 0;
      if (l.total) {
        dayQ += l.total;
        dayCor += l.correct || 0;
      }
      if (l.type === "word_study") newWords += 1;
      if (l.type === "word_review") reviewedWords += 1;
    });

    if (dayLogs.length > 0) {
      activeDatesSet.add(daySlot.dateStr);
    }

    totalQuestions += dayQ;
    totalCorrect += dayCor;
    totalDurationSec += daySec;

    return {
      dateStr: daySlot.dateStr,
      dayLabelZh: ZH_DAYS[idx],
      dayLabelKo: KO_DAYS[idx],
      questions: dayQ,
      correct: dayCor,
      accuracy: dayQ > 0 ? Math.round((dayCor / dayQ) * 100) : null,
      durationMinutes: Math.round(daySec / 60),
    };
  });

  // Also include exams completed during this week from getRecentExams if not in logs
  const weekExams = allExams.filter(
    (e) => e.updatedAt >= weekInfo.startMs && e.updatedAt <= weekInfo.endMs && e.status === "submitted"
  );
  if (totalQuestions === 0 && weekExams.length > 0) {
    weekExams.forEach((e) => {
      totalQuestions += e.questionCount || 0;
      if (typeof e.score === "number") {
        totalCorrect += Math.round((e.score / 300) * (e.questionCount || 100));
      }
    });
  }

  // Shadowing score
  const shadowingCount = weekShadowing.length;
  const avgShadowingScore =
    shadowingCount > 0
      ? Math.round(weekShadowing.reduce((sum, s) => sum + s.score, 0) / shadowingCount)
      : 0;

  // Accuracy
  const accuracyRate =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  // Comparison with last week
  let lastWeekSec = 0;
  let lastWeekQ = 0;
  let lastWeekCor = 0;
  let lastWeekWords = 0;
  lastWeekLogs.forEach((l) => {
    lastWeekSec += l.durationSec || 0;
    if (l.total) {
      lastWeekQ += l.total;
      lastWeekCor += l.correct || 0;
    }
    if (l.type === "word_study" || l.type === "word_review") lastWeekWords += 1;
  });

  const calcDelta = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  };

  const durationDelta = calcDelta(totalDurationSec, lastWeekSec);
  const questionsDelta = calcDelta(totalQuestions, lastWeekQ);
  const lastWeekAcc = lastWeekQ > 0 ? Math.round((lastWeekCor / lastWeekQ) * 100) : 0;
  const accuracyDelta = accuracyRate - lastWeekAcc;
  const wordsDelta = calcDelta(newWords + reviewedWords, lastWeekWords);

  // Top 3 mistake categories
  const mistakeCounts: Record<string, { zh: string; ko: string; count: number }> = {};
  allMistakes
    .filter((m) => m.recordedAt >= weekInfo.startMs && m.recordedAt <= weekInfo.endMs)
    .forEach((m) => {
      const secZh = m.question?.section || m.question?.partCategory || "综合";
      const secKo = m.question?.sectionKo || m.question?.partCategory || "종합";
      if (!mistakeCounts[secZh]) {
        mistakeCounts[secZh] = { zh: secZh, ko: secKo, count: 0 };
      }
      mistakeCounts[secZh].count += 1;
    });

  const topMistakeCategories = Object.values(mistakeCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((c) => ({
      nameZh: c.zh,
      nameKo: c.ko,
      count: c.count,
    }));

  const hasData =
    totalDurationSec > 0 ||
    totalQuestions > 0 ||
    newWords > 0 ||
    reviewedWords > 0 ||
    shadowingCount > 0;

  return {
    weekId: weekInfo.weekId,
    weekLabel: weekInfo.weekLabel,
    startDateStr: weekInfo.startDateStr,
    endDateStr: weekInfo.endDateStr,
    isCurrentWeek: weekOffset === 0,
    hasData,
    totalDurationMinutes: Math.round(totalDurationSec / 60),
    activeStudyDays: activeDatesSet.size,
    consecutiveStreakDays: streakDays,
    newWordsCount: newWords,
    reviewedWordsCount: reviewedWords,
    totalQuestions,
    accuracyRate,
    shadowingCount,
    avgShadowingScore,
    dailyMetrics,
    comparison: {
      durationDelta,
      questionsDelta,
      accuracyDelta,
      wordsDelta,
    },
    topMistakeCategories,
  };
}

export function generateWeeklyTextSummary(
  report: WeeklyReportData,
  locale: "ko" | "zh" = "zh"
): string {
  const isZh = locale === "zh";

  if (!report.hasData) {
    return isZh
      ? `📅 Eloise 的 HSK 学习周报 (${report.weekLabel})\n本周暂无学习记录，新的一周继续加油！`
      : `📅 Eloise의 HSK 학습 주간 리포트 (${report.weekLabel})\n이번 주 학습 기록이 없습니다. 새로운 한 주 힘차게 시작해 보세요!`;
  }

  if (isZh) {
    return `📊 Eloise 的 HSK 学习周报 (${report.weekLabel})
━━━━━━━━━━━━━━━━━━
⏱️ 累计学习时长: ${report.totalDurationMinutes} 分钟 (${report.activeStudyDays} 天打卡)
🔥 连续打卡天数: ${report.consecutiveStreakDays} 天
📝 模考刷题数量: ${report.totalQuestions} 题 (平均正确率 ${report.accuracyRate}%)
📖 单词掌握进度: 新学 ${report.newWordsCount} 词 · 复习 ${report.reviewedWordsCount} 词
🎤 口语跟读评测: ${report.shadowingCount} 次 (平均发音 ${report.avgShadowingScore} 分)
${
  report.topMistakeCategories.length > 0
    ? `⚠️ 易错薄弱分类: ${report.topMistakeCategories.map((c) => `${c.nameZh}(${c.count}题)`).join("、")}`
    : ""
}
━━━━━━━━━━━━━━━━━━
💡 备战 HSK 5 级，步步为营，每周进步看得见！`;
  }

  return `📊 Eloise의 HSK 학습 주간 리포트 (${report.weekLabel})
━━━━━━━━━━━━━━━━━━
⏱️ 총 학습 시간: ${report.totalDurationMinutes}분 (${report.activeStudyDays}일 출석)
🔥 연속 출석 일수: ${report.consecutiveStreakDays}일 달성
📝 모의고사 풀이: 총 ${report.totalQuestions}문항 (평균 정답률 ${report.accuracyRate}%)
📖 어휘 학습 진도: 신규 ${report.newWordsCount}개 · 복습 ${report.reviewedWordsCount}개
🎤 듣기 음성跟读: ${report.shadowingCount}회 (평균 발음 점수 ${report.avgShadowingScore}점)
${
  report.topMistakeCategories.length > 0
    ? `⚠️ 취약 문항 영역: ${report.topMistakeCategories.map((c) => `${c.nameKo}(${c.count}문항)`).join(", ")}`
    : ""
}
━━━━━━━━━━━━━━━━━━
💡 Eloise님의 꾸준한 HSK 고득점 완성을 응원합니다!`;
}
