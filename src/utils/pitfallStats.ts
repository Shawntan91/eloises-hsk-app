"use client";

import { PitfallCategory, PitfallCategoryStat } from "@/types/pitfall";
import { logActivity } from "./activityLogger";

const STATS_KEY = "eloise_pitfall_stats";

const CATEGORY_NAMES: Record<
  PitfallCategory,
  { zh: string; ko: string }
> = {
  tone: { zh: "声调变调与易混对", ko: "성조 변조 및 혼동 성조" },
  measure_word: { zh: "专用量词辨析", ko: "전용 양사 완벽 구분" },
  ba_sentence: { zh: "“把”字句语序与限制", ko: "‘把’자문 어순 및 제약 조건" },
  bei_sentence: { zh: "“被”字被动句结构", ko: "‘被’자문 피동형 어순" },
  le_guo: { zh: "“了”与“过”的时态区别", ko: "‘了’와 ‘过’의 상(Aspect) 구분" },
};

export function getPitfallStats(): Record<
  PitfallCategory,
  { total: number; correct: number; rate: number }
> {
  if (typeof window === "undefined") {
    return {
      tone: { total: 0, correct: 0, rate: 0 },
      measure_word: { total: 0, correct: 0, rate: 0 },
      ba_sentence: { total: 0, correct: 0, rate: 0 },
      bei_sentence: { total: 0, correct: 0, rate: 0 },
      le_guo: { total: 0, correct: 0, rate: 0 },
    };
  }

  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) {
      return {
        tone: { total: 0, correct: 0, rate: 0 },
        measure_word: { total: 0, correct: 0, rate: 0 },
        ba_sentence: { total: 0, correct: 0, rate: 0 },
        bei_sentence: { total: 0, correct: 0, rate: 0 },
        le_guo: { total: 0, correct: 0, rate: 0 },
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      tone: { total: 0, correct: 0, rate: 0 },
      measure_word: { total: 0, correct: 0, rate: 0 },
      ba_sentence: { total: 0, correct: 0, rate: 0 },
      bei_sentence: { total: 0, correct: 0, rate: 0 },
      le_guo: { total: 0, correct: 0, rate: 0 },
    };
  }
}

export function savePitfallStats(
  stats: Record<PitfallCategory, { total: number; correct: number; rate: number }>
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    window.dispatchEvent(new Event("pitfall-stats-changed"));
  } catch (e) {
    console.error("Failed to save pitfall stats", e);
  }
}

export function recordPitfallPractice(
  results: Array<{ category: PitfallCategory; isCorrect: boolean }>,
  durationSec: number = 60
): void {
  const current = getPitfallStats();

  let roundCorrect = 0;
  results.forEach((r) => {
    const prev = current[r.category] || { total: 0, correct: 0, rate: 0 };
    prev.total += 1;
    if (r.isCorrect) {
      prev.correct += 1;
      roundCorrect += 1;
    }
    prev.rate = Math.round((prev.correct / prev.total) * 100);
    current[r.category] = prev;
  });

  savePitfallStats(current);

  // Log to eloise_activity_log
  logActivity({
    type: "pitfall",
    durationSec,
    correct: roundCorrect,
    total: results.length,
    score: Math.round((roundCorrect / (results.length || 1)) * 100),
  });
}

export function getCategoryStatList(): PitfallCategoryStat[] {
  const stats = getPitfallStats();
  const cats: PitfallCategory[] = [
    "tone",
    "measure_word",
    "ba_sentence",
    "bei_sentence",
    "le_guo",
  ];

  return cats.map((cat) => {
    const s = stats[cat] || { total: 0, correct: 0, rate: 0 };
    return {
      category: cat,
      categoryNameZh: CATEGORY_NAMES[cat].zh,
      categoryNameKo: CATEGORY_NAMES[cat].ko,
      totalPracticed: s.total,
      correctCount: s.correct,
      accuracyRate: s.rate,
    };
  });
}
