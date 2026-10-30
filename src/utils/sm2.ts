"use client";

/**
 * SuperMemo SM-2 Spaced Repetition Algorithm
 * 针对 Eloise 的 HSK 词汇记忆系统实现科学的艾宾浩斯间隔复习
 */

export interface SM2Record {
  wordNo: number;
  interval: number;      // 复习间隔天数 (days)
  repetitions: number;   // 连续回答熟练次数
  easiness: number;      // 难度因子 (Easiness Factor, 默认 2.5, 最小 1.3)
  nextReviewDate: number; // 下次复习时间戳 (ms)
  lastReviewedDate: number; // 上次复习时间戳 (ms)
}

const SM2_STORAGE_KEY = "hskapp:sm2_records";

export function loadSM2Records(): Record<number, SM2Record> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SM2_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSM2Records(records: Record<number, SM2Record>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SM2_STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new Event("sm2-records-changed"));
  } catch (e) {
    console.error("Failed to save SM-2 records", e);
  }
}

/**
 * SM-2 评分标准：
 * 5 = 알아요 (잘 알고 있음 / Easy)
 * 3 = 애매해요 (알 듯 말 듯 / Hard)
 * 0 = 몰라요 (잊어버림 / Again)
 */
export function recordSM2Review(wordNo: number, grade: 5 | 3 | 0): SM2Record {
  const records = loadSM2Records();
  const current: SM2Record = records[wordNo] || {
    wordNo,
    interval: 0,
    repetitions: 0,
    easiness: 2.5,
    nextReviewDate: Date.now(),
    lastReviewedDate: Date.now(),
  };

  let { interval, repetitions, easiness } = current;

  if (grade >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = grade === 5 ? 6 : 3;
    } else {
      interval = Math.round(interval * easiness);
    }
    repetitions++;
  } else {
    // 遗忘重置
    repetitions = 0;
    interval = 1;
  }

  // 计算新的难度系数 EF (Easiness Factor)
  easiness = easiness + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (easiness < 1.3) easiness = 1.3;

  const oneDayMs = 24 * 60 * 60 * 1000;
  const nextReviewDate = Date.now() + interval * oneDayMs;

  const updated: SM2Record = {
    wordNo,
    interval,
    repetitions,
    easiness,
    nextReviewDate,
    lastReviewedDate: Date.now(),
  };

  records[wordNo] = updated;
  saveSM2Records(records);

  try {
    const { logActivity } = require("./activityLogger");
    logActivity({
      type: grade === 0 ? "word_study" : "word_review",
      durationSec: 10,
      meta: { wordNo, grade },
    });
  } catch {}

  return updated;
}

/**
 * 获取今日到期需要复习的单词编号列表
 */
export function getDueWordNos(allWordNos: number[]): number[] {
  const records = loadSM2Records();
  const now = Date.now();

  return allWordNos.filter((no) => {
    const record = records[no];
    if (!record) return false;
    return record.nextReviewDate <= now;
  });
}
