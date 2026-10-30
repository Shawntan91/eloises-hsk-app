"use client";

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  wordsCount: number;
  studyMinutes: number;
  examsCompleted: number;
}

export interface StudyGoalSettings {
  dailyWordTarget: number; // default 20
  dailyMinuteTarget: number; // default 30
  targetExamDate: string; // YYYY-MM-DD
}

const STATS_KEY = "hskapp:study_activity_v1";
const GOALS_KEY = "hskapp:study_goals_v1";

export function getTodayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getStudyActivityMap(): Record<string, DailyActivity> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStudyActivityMap(map: Record<string, DailyActivity>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event("study-activity-changed"));
  } catch (e) {
    console.error("Failed to save study activity", e);
  }
}

export function recordWordStudied(count: number = 1): void {
  const map = getStudyActivityMap();
  const today = getTodayKey();
  const current = map[today] || {
    date: today,
    wordsCount: 0,
    studyMinutes: 0,
    examsCompleted: 0,
  };
  current.wordsCount += count;
  map[today] = current;
  saveStudyActivityMap(map);
}

export function recordStudyTime(minutes: number = 1): void {
  const map = getStudyActivityMap();
  const today = getTodayKey();
  const current = map[today] || {
    date: today,
    wordsCount: 0,
    studyMinutes: 0,
    examsCompleted: 0,
  };
  current.studyMinutes += minutes;
  map[today] = current;
  saveStudyActivityMap(map);
}

export function getConsecutiveStreakDays(): number {
  const map = getStudyActivityMap();
  let streak = 0;
  const now = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    const entry = map[key];

    if (entry && (entry.wordsCount > 0 || entry.studyMinutes > 0 || entry.examsCompleted > 0)) {
      streak++;
    } else if (i === 0) {
      // If today has not had study yet, continue checking yesterday
      continue;
    } else {
      break;
    }
  }
  return streak;
}

export function getRecentHeatmapData(daysCount: number = 35): Array<{ date: string; count: number; level: number }> {
  const map = getStudyActivityMap();
  const result: Array<{ date: string; count: number; level: number }> = [];
  const now = new Date();

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    const entry = map[key];
    const totalCount = entry ? entry.wordsCount + entry.studyMinutes * 2 + entry.examsCompleted * 10 : 0;

    let level = 0;
    if (totalCount > 40) level = 4;
    else if (totalCount > 20) level = 3;
    else if (totalCount > 10) level = 2;
    else if (totalCount > 0) level = 1;

    result.push({ date: key, count: totalCount, level });
  }
  return result;
}

export function getStudyGoals(): StudyGoalSettings {
  if (typeof window === "undefined") {
    return {
      dailyWordTarget: 20,
      dailyMinuteTarget: 30,
      targetExamDate: getDefaultExamDate(),
    };
  }
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    dailyWordTarget: 20,
    dailyMinuteTarget: 30,
    targetExamDate: getDefaultExamDate(),
  };
}

export function saveStudyGoals(goals: StudyGoalSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    window.dispatchEvent(new Event("study-goals-changed"));
  } catch (e) {
    console.error("Failed to save study goals", e);
  }
}

function getDefaultExamDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30); // 30 days from now
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateDDay(targetDateStr: string): { dDayText: string; isPast: boolean; daysLeft: number } {
  if (!targetDateStr) return { dDayText: "D-30", isPast: false, daysLeft: 30 };
  const target = new Date(targetDateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { dDayText: "D-Day", isPast: false, daysLeft: 0 };
  } else if (diffDays > 0) {
    return { dDayText: `D-${diffDays}`, isPast: false, daysLeft: diffDays };
  } else {
    return { dDayText: `D+${Math.abs(diffDays)}`, isPast: true, daysLeft: diffDays };
  }
}
