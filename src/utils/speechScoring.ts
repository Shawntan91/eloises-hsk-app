"use client";

import hskWordsData from "@/data/hskWords.json";
import { logActivity } from "./activityLogger";

export interface CharDiff {
  char: string;
  status: "correct" | "error" | "missed";
  pinyin?: string;
}

export interface ShadowingRecord {
  id?: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  sentence: string;
  score: number;
}

const STORAGE_KEY = "eloise_shadowing";

// Build a fast character -> pinyin lookup from hskWords.json
const CHAR_PINYIN_MAP: Record<string, string> = {};
try {
  (hskWordsData as Array<{ word: string; pinyin: string }>).forEach((item) => {
    if (!item.word || !item.pinyin) return;
    const pyParts = item.pinyin.split(/\s+/);
    if (pyParts.length === item.word.length) {
      for (let i = 0; i < item.word.length; i++) {
        const ch = item.word[i];
        if (!CHAR_PINYIN_MAP[ch]) {
          CHAR_PINYIN_MAP[ch] = pyParts[i];
        }
      }
    }
  });
} catch {}

export function getCharPinyin(char: string): string {
  return CHAR_PINYIN_MAP[char] || "";
}

/**
 * Remove punctuation, whitespace, and symbols from Chinese sentence
 */
export function cleanChineseText(text: string): string {
  return text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, "").trim();
}

/**
 * Levenshtein distance on character arrays
 */
export function computeEditDistance(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Align target text with spoken text to highlight each character:
 * - correct (green): spoken correctly
 * - error (red): replaced by wrong character
 * - missed (grey): not spoken / skipped
 */
export function alignCharacters(target: string, spoken: string): CharDiff[] {
  const targetChars = cleanChineseText(target).split("");
  const spokenChars = cleanChineseText(spoken).split("");

  if (targetChars.length === 0) return [];
  if (spokenChars.length === 0) {
    return targetChars.map((ch) => ({
      char: ch,
      status: "missed",
      pinyin: getCharPinyin(ch),
    }));
  }

  // Needleman-Wunsch / Hirschberg style alignment DP
  const m = targetChars.length;
  const n = spokenChars.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const matchCost = targetChars[i - 1] === spokenChars[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + matchCost,
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1
      );
    }
  }

  // Backtrack to find alignment
  let i = m;
  let j = n;
  const diffs: CharDiff[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const isMatch = targetChars[i - 1] === spokenChars[j - 1];
      const matchCost = isMatch ? 0 : 1;
      if (dp[i][j] === dp[i - 1][j - 1] + matchCost) {
        diffs.unshift({
          char: targetChars[i - 1],
          status: isMatch ? "correct" : "error",
          pinyin: getCharPinyin(targetChars[i - 1]),
        });
        i--;
        j--;
        continue;
      }
    }

    if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      diffs.unshift({
        char: targetChars[i - 1],
        status: "missed",
        pinyin: getCharPinyin(targetChars[i - 1]),
      });
      i--;
    } else if (j > 0) {
      // Extra spoken character (insertion) - does not correspond to target character
      j--;
    } else {
      i--;
    }
  }

  return diffs;
}

/**
 * Calculate similarity percentage (0-100) based on Levenshtein distance
 */
export function calculateSpeechSimilarity(target: string, spoken: string): number {
  const cleanT = cleanChineseText(target).split("");
  const cleanS = cleanChineseText(spoken).split("");

  if (cleanT.length === 0 || cleanS.length === 0) return 0;

  const dist = computeEditDistance(cleanT, cleanS);
  const maxLen = Math.max(cleanT.length, cleanS.length);
  const similarity = Math.max(0, 1 - dist / maxLen);

  return Math.round(similarity * 100);
}

export function getScoreRating(score: number): {
  tier: "excellent" | "good" | "retry";
  labelZh: string;
  labelKo: string;
  badgeClass: string;
} {
  if (score >= 90) {
    return {
      tier: "excellent",
      labelZh: "太棒了！发音极准",
      labelKo: "아주 훌륭해요! 원어민 발음",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-300",
    };
  }
  if (score >= 70) {
    return {
      tier: "good",
      labelZh: "不错！继续保持",
      labelKo: "좋아요! 충분히 잘 통합니다",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-300",
    };
  }
  return {
    tier: "retry",
    labelZh: "再试一次，注意声调",
    labelKo: "한 번 더 시도해 보세요",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-300",
  };
}

export function getShadowingRecords(): ShadowingRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveShadowingRecord(sentence: string, score: number): void {
  if (typeof window === "undefined") return;
  try {
    const records = getShadowingRecords();
    const today = new Date().toISOString().slice(0, 10);
    const newRecord: ShadowingRecord = {
      date: today,
      timestamp: Date.now(),
      sentence: sentence.slice(0, 100),
      score,
    };
    records.push(newRecord);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-200)));

    // Log to eloise_activity_log
    logActivity({
      type: "shadowing",
      durationSec: 15,
      score,
      meta: { sentence: sentence.slice(0, 40) },
    });

    window.dispatchEvent(new Event("eloise-shadowing-changed"));
  } catch (e) {
    console.error("Failed to save shadowing record", e);
  }
}
